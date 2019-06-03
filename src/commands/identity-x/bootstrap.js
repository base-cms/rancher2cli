const r2 = require('@endeavorb2b/rancher2api');
const { workloadConfig, upsertWorkload } = require('./workload');

const { log } = console;
const {
  RANCHER_URL: uri,
  RANCHER_TOKEN: token,
  RANCHER_CLUSTERID: clusterId,
} = require('./env');

const serviceIngressRules = (namespace) => {
  const targetPort = 80;
  const rules = [
    {
      workloadIds: [`deployment:${namespace}:graphql`],
      host: 'identity-x.base-cms.io',
      path: '/graphql',
    },
    {
      workloadIds: [`deployment:${namespace}:graphql`],
      host: 'identity-x.base-cms.io',
      path: '/_health',
    },
    {
      workloadIds: [`deployment:${namespace}:manage`],
      host: 'identity-x.base-cms.io',
    },
  ];

  return rules.map(({ workloadIds, host, path }) => ({ host, paths: [{ targetPort, workloadIds, path }] }));
};

const getProject = async () => {
  const projects = await r2.project.list({ uri, token, clusterId });
  const name = 'Platform';
  const matched = projects.filter(p => p.name === name);
  if (matched.length) return matched[0];
  return r2.project.create({ uri, token, clusterId, name });
};

const getNamespace = async (projectId) => {
  const name = 'identity-x';
  const namespaces = await r2.namespace.list({ uri, token, clusterId });
  const matched = namespaces.filter(n => n.id === name);
  if (matched.length) return matched[0];
  return r2.namespace.create({ uri, token, clusterId, projectId, name });
};

const upsertIngress = async ({ name, namespaceId, projectId, ingresses, rules }) => {
  const id = `${namespaceId}:${name}`;
  const matched = ingresses.filter(w => w.id === id);

  if (matched.length) {
    log(`Updating balancer ${id}`);
    return r2.ingress.update({
      uri,
      token,
      projectId,
      namespaceId,
      ingressId: id,
      rules,
    });
  }
  log(`Creating balancer ${id}`);
  return r2.ingress.create({
    uri,
    token,
    projectId,
    namespaceId,
    name,
    rules,
  });
};

const createServices = async () => {
  const services = [
    'application',
    'graphql',
    'mailer',
    'manage',
    'membership',
    'organization',
    'token',
    'user',
  ];

  try {
    const { id: projectId } = await getProject();
    const { id: namespaceId } = await getNamespace(projectId);
    log(`Loaded namespace ${namespaceId} for services`);

    log('Retrieving project workloads');
    const workloads = await r2.workload.list({ uri, token, clusterId, projectId });

    await Promise.all(services.map(async (name) => {
      const { containers, labels } = workloadConfig(name, namespaceId);
      const workload = await upsertWorkload({ name, namespaceId, projectId, containers, workloads, labels });
      log(`Upserted workload ${workload.id}`);
    }));

    const ingresses = await r2.ingress.list({ uri, token, projectId });
    const svcIngress = await upsertIngress({
      name: 'services',
      namespaceId,
      projectId,
      ingresses,
      rules: serviceIngressRules(namespaceId),
    });
    log(`Upserted balancer ${svcIngress.id}`);

    return;
  } catch (e) {
    log('Error!', e);
  }
};

module.exports = () => {

  log('Creating services');
  createServices().then(() => log('Complete!'));

};
