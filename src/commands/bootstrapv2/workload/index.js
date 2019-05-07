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

const scale = (obj, n = 1) => new Array(n).fill(obj);

const workloadConfig = (workload, site, namespaceId) => {
  const { replicaSet, key, tenantKey } = site;
  const target = workload === 'website' ? `${workload}-${key}` : workload;
  const labels = {
    'basecms-service': workload,
    'workload.user.cattle.io/workloadselector': `deployment-${namespaceId}-${target}`,
  };
  switch (workload) {
    case 'graphql-server':
      return {
        containers: [graphql(replicaSet)],
        labels,
      };
    case 'website':
      const image = publishedSites.includes(key) ? `endeavorb2b/website-${key}:v${WEBSITE_VERSION}` : 'endeavorb2b/website-blank:v0.0.1'
      const containers = [publishedSites.includes(key) ? website(key, image, tenantKey) : website(key, image, tenantKey)];
      return {
        containers,
        labels: { ...labels, 'basecms-website': key },
      };
    case 'sitemaps':
      return {
        containers: [sitemaps(replicaSet)],
        labels,
      };
    case 'rss':
      return {
        containers: [rss(replicaSet)],
        labels,
      };
  }
  throw new Error(`Unknown workload ${workload}!`);
};

module.exports = {
  workloadConfig,
  upsertWorkload,
};
