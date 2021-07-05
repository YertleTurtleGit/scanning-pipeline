module.exports = {
   plugins: ["jsdoc"],
   extends: ["eslint:recommended", "plugin:jsdoc/recommended"],
   env: { es2020: true, browser: true },
   parserOptions: { ecmaVersion: 2020 },
   rules: {
      "jsdoc/require-param-description": 0,
      "jsdoc/require-returns-description": 0,
   },
   ecmaFeatures: { impliedStrict: true },
};
