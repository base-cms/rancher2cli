const {
  MONGO_DSN,
  GRAPHQL_VERSION,
  MANAGE_VERSION,
  SERVICE_VERSION,
  NEW_RELIC_LICENSE_KEY,
  ENGINE_API_KEY,
  SENDGRID_API_KEY,
  TOKEN_SECRET,
} = require('../env');

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

const defaultResources = {
  limits: { cpu: '500m', memory: '350Mi' },
  requests: { cpu: '25m', memory: '275Mi' },
};

const resources = {
  application: { ...defaultResources },
  graphql: {
    limits: { cpu: '1500m', memory: '450Mi' },
    requests: { cpu: '600m', memory: '350Mi' },
  },
  mailer: { ...defaultResources },
  manage: { ...defaultResources },
  membership: { ...defaultResources },
  organization: { ...defaultResources },
  token: { ...defaultResources },
  user: { ...defaultResources },
};

const environment = {
  MONGO_DSN,
  NEW_RELIC_ENABLED: true,
  NEW_RELIC_LICENSE_KEY,
};

const containersFor = (name) => {
  switch (name) {
    case 'graphql':
      return {
        ...containerSpecs,
        resources: { ...resources.graphql },
        environment: {
          ENGINE_API_KEY,
          ...environment,
        },
        image: `basecms/identity-x-graphql-service:v${GRAPHQL_VERSION}`,
        name,
      };
    case 'manage':
      return {
        ...containerSpecs,
        livenessProbe: { ...containerSpecs.livenessProbe, path: '/' },
        readinessProbe: { ...containerSpecs.readinessProbe, path: '/' },
        resources: { ...resources.manage },
        image: `basecms/identity-x-manage-service:v${MANAGE_VERSION}`,
        name,
      };
    case 'mailer':
      return {
        ...containerSpecs,
        resources: { ...resources[name] },
        environment: {
          SENDGRID_API_KEY,
          ...environment,
        },
        image: `basecms/identity-x-mailer-service:v${SERVICE_VERSION}`,
        name,
      };
    case 'token':
      return {
        ...containerSpecs,
        resources: { ...resources[name] },
        environment: {
          TOKEN_SECRET,
          ...environment,
        },
        image: `basecms/identity-x-token-service:v${SERVICE_VERSION}`,
        name,
      };
    default:
      return {
        ...containerSpecs,
        resources: { ...resources[name] },
        environment,
        image: `basecms/identity-x-${name}-service:v${SERVICE_VERSION}`,
        name,
      };
  }
};

module.exports = {
  containersFor,
};
