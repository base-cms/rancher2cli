const r2 = require('@endeavorb2b/rancher2api');
const { containersFor } = require('./container-specs');
const { RANCHER_URL: uri, RANCHER_TOKEN: token } = require('../env');

const { log } = console;

const upsertWorkload = ({ name, namespaceId, projectId, workloads, containers, labels = {} }) => {
  const workloadId = `deployment:${namespaceId}:${name}`;
  const matched = workloads.filter(w => w.id === workloadId);

  if (matched.length) {
    log(`Updating workload ${workloadId}`);
    return r2.workload.update({ uri, token, projectId, workloadId, containers, labels });
  }
  log(`Creating workload ${workloadId}`);
  return r2.workload.create({ uri, token, projectId, namespaceId, name, containers, labels });
};

const workloadConfig = (workload, namespaceId) => {
  const labels = {
    'basecms-identity-x-service': workload,
    'workload.user.cattle.io/workloadselector': `deployment-${namespaceId}-${workload}`,
  };
  return {
    containers: [containersFor(workload)],
    labels,
  };
};

module.exports = {
  workloadConfig,
  upsertWorkload,
};
