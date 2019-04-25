const r2 = require('@endeavorb2b/rancher2api');
const { eachSeries } = require('@base-cms/async');

const {
  RANCHER_URL: uri,
  RANCHER_TOKEN: token,
  RANCHER_CLUSTERID: clusterId,
} = process.env;

const { log } = console;

const getNamespaces = async (namespace) => {
  const namespaces = await r2.namespace.list({ uri, token, clusterId});
  return namespaces.filter(n => !namespace || namespace && n.id === namespace);
};

const getWorkloads = async (projectId, key, value) => {
  const workloads = await r2.workload.list({ uri, token, projectId });
  return workloads.filter(w => w.labels[key] === value);
};

const upgradeService = ({ projectId, id, deploymentConfig, containers }, image) => {
  containers[0].image = image;
  return r2.workload.update({
    uri,
    token,
    projectId,
    deploymentConfig,
    workloadId: id,
    containers,
  });
};

module.exports = async ({ key, value, image, namespace }) => {
  log('Retrieving namespaces...');
  const namespaces = await getNamespaces(namespace);
  const namespaceIds = namespaces.map(({ id }) => id);
  const projectIds = [...new Set(namespaces.map(({ projectId }) => projectId))];

  const workloads = [];
  log('Retrieving workloads...');
  await eachSeries(projectIds, async (projectId) => {
    const projectWorkloads = await getWorkloads(projectId, key, value);
    projectWorkloads
      .filter(({ namespaceId }) => namespaceIds.includes(namespaceId))
      .forEach(workload => workloads.push(workload));
  });

  log(`Upgrading ${workloads.length} workloads...`);
  await eachSeries(workloads, async (workload) => {
    log(`Upgrading workload in ${workload.namespaceId}`);
    await upgradeService(workload, image)
  });
  log('Done with upgrades.');
};
