const r2 = require('@endeavorb2b/rancher2api');
const { join } = require('path')
const { workloadConfig, upsertWorkload } = require('./workload');

const websitesPath = join(__dirname, '../../../../websites');
const sites = require(join(websitesPath, 'sites'));

const { log } = console;
const {
  RANCHER_URL: uri,
  RANCHER_TOKEN: token,
  RANCHER_CLUSTERID: clusterId,
  RS_CAPRICA,
  RS_PICON,
  RS_AERILON,
} = require('./env');

const RS = {
  caprica: RS_CAPRICA,
  picon: RS_PICON,
  aerilon: RS_AERILON,
};

const ingressRulesFor = ({ accountKey, groupKey, domain, namespace }) => {
  const targetPort = 80;
  const rules = [
    {
      workloadIds: [`deployment:${namespace}:graphql`],
      host: `${accountKey}-${groupKey}.graphql.base-cms.io`,
    },
    {
      workloadIds: [`deployment:${namespace}:sitemaps`],
      host: `${accountKey}-${groupKey}.sitemaps.base-cms.io`,
    },
    {
      workloadIds: [`deployment:${namespace}:rss`],
      host: `${accountKey}-${groupKey}.rss.base-cms.io`,
    },
    {
      workloadIds: [`deployment:${namespace}:website`],
      host: `next.${domain}`,
    },
    {
      workloadIds: [`deployment:${namespace}:website`],
      host: `balancer.${namespace}.10.0.8.155.xip.io`,
    },
  ];

  return rules.map(({ workloadIds, host }) => ({ host, paths: [{ targetPort, workloadIds }] }));
};

const getProjectFor = async (group) => {
  const projects = await r2.project.list({ uri, token, clusterId });
  const name = group.project || group.accountKey;
  const matched = projects.filter(p => p.name === name);
  if (matched.length) return matched[0];
  return r2.project.create({ uri, token, clusterId, name });
};

const getNamespaceFor = async (name, projectId) => {
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

const main = async (k, group, cronMinute) => {
  try {
    // log(`${k}: Checking project/namespace`);

    const { id: projectId, name } = await getProjectFor(group);
    // log(`${k}: Loaded project ${name} (${projectId}) for site ${group.name}`);

    const { id: namespaceId } = await getNamespaceFor(k, projectId);
    // log(`${k}: Loaded namespace ${namespaceId} for site ${group.name}`);

    const workloads = await r2.workload.list({ uri, token, clusterId, projectId });

    const services = ['graphql', 'website', 'sitemaps', 'rss'];
    await Promise.all(services.map(async (name) => {
      const { containers, labels, cronJobConfig } = workloadConfig(name, group, namespaceId, cronMinute);
      const workload = await upsertWorkload({ name, namespaceId, projectId, containers, workloads, labels, cronJobConfig });
      log(`${k}: Upserted workload ${workload.id}`);
    }));

    const ingresses = await r2.ingress.list({ uri, token, projectId });
    const rules = ingressRulesFor(group);
    const ingress = await upsertIngress({
      name: 'balancer',
      namespaceId,
      projectId,
      ingresses,
      rules,
    });
    log(`${k}: Upserted balancer ${ingress.id}`);
  } catch (e) {
    log(`${k}: Error!`, e);
  }
};

module.exports = () => {

  const websites = Object.keys(sites).reduce((obj, namespace) => {
    const site = sites[namespace];
    const replicaSet = RS[site.replicaSet];
    return { ...obj, [namespace]: { ...site, namespace, replicaSet } };
  }, {});

  // main('test', websites['test'], 0);
  // main('firehouse', websites['firehouse'], 0);
  // main('hcinnovationgroup', websites['hcinnovationgroup'], 0);
  // main('madeinamericaseries', websites['madeinamericaseries'], 0);

  // // Iterate over all
  Object.keys(websites)
    .reduce((c, k, i) => c.then(res => main(k, websites[k], i % 60).then(r => [ ...res, r ])), Promise.resolve([]))
    .then(() => log('Complete!'));
};
