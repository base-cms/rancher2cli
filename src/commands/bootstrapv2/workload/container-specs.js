const {
  GRAPHQL_VERSION,
  SITEMAP_VERSION,
  RSS_VERSION,
  NEW_RELIC_LICENSE_KEY,
  ENGINE_API_KEY,
  RECAPTCHA_SECRET_KEY,
  SENDGRID_API_KEY,
} = require('../env');

const pendingImgix = [
  'officer',
  'evaluationengineering',
  'plasticsmachinerymagazine',
  'athleticbusiness',
  'aquamagazine',
  'woodfloorbusiness',
  'clevescene',
  'metrotimes',
  'orlandoweekly',
  'sacurrent',
  'riverfronttimes',
  'outinsa',
  'outinstl',
  'packworld',
  'automationworld',
  'healthcarepackaging',
  'profoodworld',
  'oemmagazine',
];
const getImageDomain = domain => pendingImgix.includes(domain)
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
    limits: { cpu: '500m', memory: '350Mi' },
    requests: { cpu: '25m', memory: '275Mi' },
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

const resources = {
  website: {
    limits: { cpu: '1000m', memory: '350Mi' },
    requests: { cpu: '150m', memory: '275Mi' },
  },
  graphql: {
    limits: { cpu: '1500m', memory: '450Mi' },
    requests: { cpu: '400m', memory: '350Mi' },
  },
  sitemaps: {
    limits: { cpu: '500m', memory: '300Mi' },
    requests: { cpu: '100m', memory: '250Mi' },
  },
  rss: {
    limits: { cpu: '1000m', memory: '150Mi' },
    requests: { cpu: '100m', memory: '100Mi' },},
}

module.exports = {
  graphql: (MONGO_DSN, version = GRAPHQL_VERSION) => ({
    ...containerSpecs,
    resources: { ...resources.graphql },
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
    resources: { ...resources.sitemaps },
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
    resources: { ...resources.rss },
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
    resources: { ...resources.website },
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
