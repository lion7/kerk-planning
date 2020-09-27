import merge from 'deepmerge';

// use createSpaConfig for bundling a Single Page App
// import { createSpaConfig } from '@open-wc/building-rollup';

// use createBasicConfig to do regular JS to JS bundling
import { createBasicConfig } from '@open-wc/building-rollup';

const baseConfig = createBasicConfig({
  // use the outputdir option to modify where files are output
  // outputDir: 'dist',

  // if you need to support older browsers, such as IE11, set the legacyBuild
  // option to generate an additional build just for this browser
  // legacyBuild: true,

  // set to true to inject the service worker registration into your index.html
  injectServiceWorker: false,
});

export default merge(baseConfig, {
  // if you use createSpaConfig, you can use your index.html as entrypoint,
  // any <script type="module"> inside will be bundled by rollup
  // input: './index.html',

  // alternatively, you can use your JS as entrypoint for rollup and
  // optionally set a HTML template manually
  input: './dist/kerk-planning.js',

  // set the filename to a fixed value
  output: {
    entryFileNames: '[name].]-min.js',
    chunkFileNames: '[name].min.js',
  }
});
