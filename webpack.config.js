const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const extensionConfig = {
  target: "node",
  mode: "production",
  entry: path.resolve(__dirname, "src/extension.js"),
  output: {
    path: path.resolve(__dirname, "out"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    clean: true,
  },
  externals: [
    {
      vscode: "commonjs vscode",
      "cpu-features": "commonjs cpu-features",
    },
    ({ request }, callback) => {
      if (/\.node$/.test(request)) {
        return callback(null, `commonjs ${request}`);
      }
      callback();
    },
  ],
  resolve: {
    extensions: [".js", ".json"],
    alias: {
      vue$: "vue/dist/vue.esm-bundler.js",
    },
  },
  optimization: {
    minimize: false,
  },
  performance: {
    hints: false,
  },
  devtool: false,
};

const webviewConfig = {
  target: "web",
  mode: "production",
  entry: path.resolve(__dirname, "src/webview/main.js"),
  output: {
    path: path.resolve(__dirname, "out/webview/js"),
    filename: "app.js",
    clean: true,
  },
  resolve: {
    extensions: [".js", ".json"],
    alias: {
      vue$: "vue/dist/vue.esm-bundler.js",
    },
  },
  module: {
    rules: [
      {
        test: /\.svg$/i,
        type: "asset/inline",
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "public/index.html"),
          to: path.resolve(__dirname, "out/webview/index.html"),
        },
        {
          from: path.resolve(__dirname, "public/app.html"),
          to: path.resolve(__dirname, "out/webview/app.html"),
        },
        {
          from: path.resolve(__dirname, "public/js/oldCompatible.js"),
          to: path.resolve(__dirname, "out/webview/js/oldCompatible.js"),
        },
      ],
    }),
  ],
  optimization: {
    minimize: false,
  },
  performance: {
    hints: false,
  },
  devtool: false,
};

module.exports = [extensionConfig, webviewConfig];
