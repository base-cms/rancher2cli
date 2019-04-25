const { readdirSync, statSync } = require('fs')
const { join } = require('path')
const r2 = require('@endeavorb2b/rancher2api');
const { graphql, sitemaps, website, rss } = require('./container-specs');

const { log } = console;
const websitesPath = join(__dirname, '../../../../../websites');
const dirs = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory())
const publishedSites = dirs(join(websitesPath, 'sites'));

const {
  RANCHER_URL: uri,
  RANCHER_TOKEN: token,
  WEBSITE_VERSION,
} = require('../env');

const upsertWorkload = ({ name, namespaceId, projectId, workloads, containers, cronJobConfig, labels = {} }) => {
  const type = cronJobConfig ? 'cronjob' : 'deployment';
  const workloadId = `${type}:${namespaceId}:${name}`;
  const matched = workloads.filter(w => w.id === workloadId);

  if (matched.length) {
    log(`Updating workload ${workloadId}`);
    return r2.workload.update({ uri, token, projectId, workloadId, containers, labels, cronJobConfig });
  }
  log(`Creating workload ${workloadId}`);
  return r2.workload.create({ uri, token, projectId, namespaceId, name, containers, labels, cronJobConfig });
};

const workloadConfig = (workload, site, namespaceId, n) => {
  const { accountKey: account, groupKey: group, replicaSet, tenantKey } = site;
  const labels = {
    'basecms-service': workload,
    account,
    group,
    'workload.user.cattle.io/workloadselector': `deployment-${namespaceId}-${workload}`,
  };
  switch (workload) {
    case 'graphql':
      return {
        containers: [graphql(replicaSet, tenantKey, namespaceId)],
        labels: { ...labels, 'basecms-service': 'graphql-server' },
      };
    case 'website':
      const containers = [publishedSites.includes(namespaceId) ? website(namespaceId, WEBSITE_VERSION) : website()];
      return {
        containers,
        labels,
      };
    case 'sitemaps':
      return {
        containers: [sitemaps(replicaSet, tenantKey)],
        labels,
      };
    case 'rss':
      return {
        containers: [rss(replicaSet, tenantKey)],
        labels,
      };
  }
  throw new Error(`Unknown workload ${workload}!`);
};

module.exports = {
  workloadConfig,
  upsertWorkload,
};
