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

const websiteIngressRulesFor = (namespace, sites = []) => {
  const set = [];
  const targetPort = 80;
  sites.filter(s => s.namespace === namespace).forEach(({ domain, key, accountKey, groupKey }) => {
    const target = `website-${key}`;
    const entries = [
      {
        workloadIds: [`deployment:${namespace}:${target}`],
        host: `next.${accountKey}-${groupKey}.baseplatform.io`,
      },
      {
        workloadIds: [`deployment:${namespace}:${target}`],
        host: `next.${domain}`,
      },
      {
        workloadIds: [`deployment:${namespace}:${target}`],
        host: `www.${domain}`,
      },
      // {
      //   workloadIds: [`deployment:${namespace}:${target}`],
      //   host: `${target}.${namespace}.10.0.8.155.xip.io`,
      // },
    ];

    const rules = entries.map(({ workloadIds, host }) => ({ host, paths: [{ targetPort, workloadIds }] }));
    rules.forEach(rule => set.push(rule));
  });
  return set;
};


const serviceIngressRules = (namespace) => {
  const targetPort = 80;
  const rules = [
    {
      workloadIds: [`deployment:${namespace}:graphql-server`],
      host: `${namespace}.graphql.base-cms.io`,
    },
    {
      workloadIds: [`deployment:${namespace}:sitemaps`],
      host: `${namespace}.sitemaps.base-cms.io`,
    },
    {
      workloadIds: [`deployment:${namespace}:rss`],
      host: `${namespace}.rss.base-cms.io`,
    },
  ];

  return rules.map(({ workloadIds, host }) => ({ host, paths: [{ targetPort, workloadIds }] }));
};

const getProjectFor = async (namespace) => {
  const projects = await r2.project.list({ uri, token, clusterId });
  const name = `${namespace.charAt(0).toUpperCase()}${namespace.slice(1)}`;
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

const createWebsite = async (k, group, cronMinute) => {
  try {
    const { id: projectId } = await getProjectFor(group.namespace);
    const { id: namespaceId } = await getNamespaceFor(group.namespace, projectId);
    log(`${k}: Loaded namespace ${namespaceId} for site ${group.name}`);

    const workloads = await r2.workload.list({ uri, token, clusterId, projectId });

    // const services = ['graphql', 'website', 'sitemaps', 'rss'];
    // await Promise.all(services.map(async (name) => {
    const name = `website-${k}`;
    const { containers, labels } = workloadConfig('website', group, namespaceId, cronMinute);
    // console.log({ containers });
    // process.exit(1);

    const workload = await upsertWorkload({ name, namespaceId, projectId, containers, workloads, labels });
    log(`${k}: Upserted workload ${workload.id}`);
    // // }));

    // const ingresses = await r2.ingress.list({ uri, token, projectId });
    // const rules = websiteIngressRulesFor(group);
    // const ingress = await upsertIngress({
    //   name: 'websites',
    //   namespaceId,
    //   projectId,
    //   ingresses,
    //   rules,
    // });
    // log(`${k}: Upserted balancer ${ingress.id}`);
  } catch (e) {
    log(`${k}: Error!`, e);
  }
};

const createReplicaSet = async (k, websites) => {
  try {
    const { id: projectId } = await getProjectFor(k);
    const { id: namespaceId } = await getNamespaceFor(k, projectId);
    // log(`${k}: Loaded namespace ${namespaceId} for site ${k}`);

    log('Retrieving project workloads');
    const workloads = await r2.workload.list({ uri, token, clusterId, projectId });

    const services = ['graphql-server', 'sitemaps', 'rss'];
    await Promise.all(services.map(async (name) => {
      const group = {
        replicaSet: RS[k],
      };
      const { containers, labels, cronJobConfig } = workloadConfig(name, group, namespaceId);
      const workload = await upsertWorkload({ name, namespaceId, projectId, containers, workloads, labels, cronJobConfig });
      log(`${k}: Upserted workload ${workload.id}`);
    }));

    const ingresses = await r2.ingress.list({ uri, token, projectId });
    const svcIngress = await upsertIngress({
      name: 'services',
      namespaceId,
      projectId,
      ingresses,
      rules: serviceIngressRules(namespaceId),
    });
    log(`${k}: Upserted balancer ${svcIngress.id}`);

    const websitesArr = Object.values(websites);
    const rules = websiteIngressRulesFor(namespaceId, websitesArr);

    const webIngress = await upsertIngress({
      name: 'websites',
      namespaceId,
      projectId,
      ingresses,
      rules,
    });
    log(`${k}: Upserted balancer ${webIngress.id}`);

    return;
  } catch (e) {
    log(`${k}: Error!`, e);
  }
};

module.exports = () => {

  const websites = Object.keys(sites).reduce((obj, key) => {
    const site = sites[key];
    const replicaSet = RS[site.replicaSet];
    const namespace = site.replicaSet;
    return { ...obj, [key]: { ...site, namespace, key, replicaSet } };
  }, {});

  // const k = 'utilityproducts';
  // createWebsite(k, websites[k]);
  // return;

  log('Creating ReplicaSet v2 infrastructure');
  ['caprica', 'aerilon', 'picon'].reduce((c, k, i) => c.then(res => createReplicaSet(k, websites).then(r => [ ...res, r ])), Promise.resolve([]))
  .then(() => log('Complete!'));

  // Iterate over all
  log('Creating Website v2 infrastructure');
  Object.keys(websites)
    .reduce((c, k, i) => c.then(res => createWebsite(k, websites[k], i % 60).then(r => [ ...res, r ])), Promise.resolve([]))
    .then(() => log('Complete!'));

};
