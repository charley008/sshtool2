const path = require("path");

module.exports = {
  target: "web",
  entry: path.resolve(__dirname, "src/webview/main.js"),
  output: {
    path: path.resolve(__dirname, "out/webview/js"),
    filename: "app.xplot.js",
    clean: false,
  },
  resolve: {
    extensions: [".js", ".vue", ".json"],
    alias: {
      vue$: "vue/dist/vue.esm-bundler.js",
    },
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: "vue-loader",
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new (require("vue-loader").VueLoaderPlugin)(),
  ],
  optimization: {
    splitChunks: false,
    runtimeChunk: false,
    minimizer: [
      new (require("terser-webpack-plugin"))({
        terserOptions: {
          compress: { drop_console: false },
        },
      }),
    ],
  },
  performance: {
    hints: false,
  },
};
