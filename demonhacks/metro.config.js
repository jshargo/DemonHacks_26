const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Stub out modules that use Web Workers (not available in Metro).
// Chain: @tambo-ai/react → react-media-recorder → extendable-media-recorder → Worker 💥
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'extendable-media-recorder' ||
    moduleName === 'extendable-media-recorder-wav-encoder'
  ) {
    return {
      type: 'empty',
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
