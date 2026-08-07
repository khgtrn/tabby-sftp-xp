const path = require('path');

/** @type {import('@rspack/cli').Configuration} */
module.exports = {
  target: 'node',
  entry: './src/index.ts',
  context: __dirname,
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    clean: true,
    library: { type: 'umd' },
    devtoolModuleFilenameTemplate: 'webpack-tabby-sftp-xp:///[resource-path]',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@sftp-xp': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: { syntax: 'typescript', decorators: true },
            transform: { legacyDecorator: true, decoratorMetadata: true },
            target: 'es2020',
          },
        },
      },
      // Angular component templates: imported as raw strings and assigned to `template`.
      {
        test: /\.html$/,
        type: 'asset/source',
      },
      // Angular component styles: compiled by sass-loader, then imported as a raw string
      // for the `styles` array (Angular handles view-encapsulated injection itself).
      {
        test: /global\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.scss$/,
        exclude: /global\.scss$/,
        type: 'asset/source',
        use: ['sass-loader'],
      },
      // monaco-editor ships plain .css files it expects to be injected globally.
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.ttf$/,
        type: 'asset/resource',
      },
    ],
  },
  externals: [
    'fs',
    'path',
    'os',
    'stream',
    // ssh2 itself is pure JavaScript and is bundled so a development plugin built in
    // WSL can be loaded by Tabby on Windows without resolving WSL node_modules.
    // Its optional native accelerator is deliberately left to Node's fallback path.
    'cpu-features',
    /^@angular\//,
    /^@ng-bootstrap\//,
    /^rxjs/,
    /^tabby-/,
  ],
  // ssh2 probes for an optional native accelerator inside a try/catch and
  // automatically uses its JavaScript implementation when it is absent.
  ignoreWarnings: [/Can't resolve '\.\/crypto\/build\/Release\/sshcrypto\.node'/],
};
