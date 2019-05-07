const {
  GRAPHQL_VERSION,
  SITEMAP_VERSION,
  RSS_VERSION,
  NEW_RELIC_LICENSE_KEY,
  ENGINE_API_KEY,
  RECAPTCHA_SECRET_KEY,
  SENDGRID_API_KEY,
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
      memory: '350Mi',
    },
    requests: {
      cpu: '25m',
      memory: '275Mi',
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
  graphql: (MONGO_DSN, version = GRAPHQL_VERSION) => ({
    ...containerSpecs,
    environment: {
      MONGO_DSN,
      ENGINE_API_KEY,
      NEW_RELIC_ENABLED,
      NEW_RELIC_LICENSE_KEY,
    },
    image: `basecms/graphql-server:v${version}`,
    name: 'graphql-server',
  }),
  sitemaps: (MONGO_DSN, version = SITEMAP_VERSION) => ({
    ...containerSpecs,
    environment: {
      MONGO_DSN,
      NEW_RELIC_ENABLED,
      NEW_RELIC_LICENSE_KEY,
    },
    image: `basecms/sitemaps:v${version}`,
    name: 'sitemaps',
  }),
  rss: (MONGO_DSN, version = RSS_VERSION) => ({
    ...containerSpecs,
    environment: {
      MONGO_DSN,
      NEW_RELIC_ENABLED,
      NEW_RELIC_LICENSE_KEY,
    },
    name: 'rss',
    image: `basecms/rss:v${version}`,
  }),
  website: (key, image, TENANT_KEY) => ({
    ...containerSpecs,
    environment: {
      NEW_RELIC_ENABLED,
      NEW_RELIC_LICENSE_KEY,
      TENANT_KEY,
      GRAPHQL_URI: 'http://graphql-server',
      SITEMAPS_URI: 'http://sitemaps',
      RSS_URI: 'http://rss',
      CDN_IMAGE_HOSTNAME: getImageDomain(key),
      CDN_ASSET_HOSTNAME: `cdn.${key}.com`,
      RECAPTCHA_SECRET_KEY,
      SENDGRID_API_KEY,
    },
    image,
    name: `website-${key}`,
  }),
};
