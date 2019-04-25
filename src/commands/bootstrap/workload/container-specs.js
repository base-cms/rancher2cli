const {
  GRAPHQL_VERSION,
  SITEMAP_VERSION,
  RSS_VERSION,
  NEW_RELIC_LICENSE_KEY,
} = require('../env');

const getImageDomain = domain => ['officer', 'evaluationengineering', 'plasticsmachinerymagazine'].includes(domain)
  ? 'base.imgix.net'
  : `img.${domain}.com`;

const NEW_RELIC_ENABLED = true;

const healthCheck = {
  failureThreshold: 3,
  path: '/_health',
  port: 80,
  scheme: 'HTTP',
  initialDelaySeconds: 10,
  periodSeconds: 2,
  successThreshold: 1,
  timeoutSeconds: 2,
  tcp: false,
};
const securityContext = {
  allowPrivilegeEscalation: false,
  privileged: false,
  procMount: 'Default',
  readOnly: false,
  runAsNonRoot: false,
  resources: {
    limits: {
      cpu: '500m',
      memory: '128Mi',
    },
    requests: {
      cpu: '25m',
      memory: '64Mi',
    },
  },
  terminationMessagePath: '/dev/termination-log',
  terminationMessagePolicy: 'File',
};
const containerSpecs = {
  imagePullPolicy: 'IfNotPresent',
  livenessProbe: healthCheck,
  readinessProbe: healthCheck,
  stdin: true,
  tty: true,
  ...securityContext,
};

module.exports = {
  graphql: (MONGO_DSN, TENANT_KEY, domain, version = GRAPHQL_VERSION) => ({
    ...containerSpecs,
    environment: {
      MONGO_DSN,
      TENANT_KEY,
      NEW_RELIC_ENABLED,
      NEW_RELIC_LICENSE_KEY,
      CDN_IMAGE_HOSTNAME: getImageDomain(domain),
      CDN_ASSET_HOSTNAME: `cdn.${domain}.com`,
    },
    image: `basecms/graphql-server:v${version}`,
    name: 'graphql',
  }),
  sitemaps: (MONGO_DSN, TENANT_KEY, version = SITEMAP_VERSION) => ({
    ...containerSpecs,
    environment: {
      MONGO_DSN,
      TENANT_KEY,
      NEW_RELIC_ENABLED,
      NEW_RELIC_LICENSE_KEY,
    },
    image: `basecms/sitemaps:v${version}`,
    name: 'sitemaps',
  }),
  rss: (MONGO_DSN, TENANT_KEY, version = RSS_VERSION) => ({
    ...containerSpecs,
    environment: {
      MONGO_DSN,
      TENANT_KEY,
      NEW_RELIC_ENABLED,
      NEW_RELIC_LICENSE_KEY,
    },
    name: 'rss',
    image: `basecms/rss:v${version}`,
  }),
  website: (key = 'blank', version = '0.0.1') => ({
    ...containerSpecs,
    environment: {
      NEW_RELIC_ENABLED,
      NEW_RELIC_LICENSE_KEY,
      GRAPHQL_URI: 'http://graphql',
      SITEMAPS_URI: 'http://sitemaps',
      RSS_URI: 'http://rss',
    },
    image: `endeavorb2b/website-${key}:v${version}`,
    name: 'website',
  }),
};
