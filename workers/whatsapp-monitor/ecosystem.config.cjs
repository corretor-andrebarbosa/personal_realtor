// pm2 start ecosystem.config.cjs
// Para iniciar ambos: pm2 start ecosystem.config.cjs
// Para iniciar só um:  pm2 start ecosystem.config.cjs --only wa-grupo
module.exports = {
  apps: [
    {
      // Monitora o grupo Corretores Autônomos JP com o número 5450
      name: 'wa-grupo',
      script: 'index.mjs',
      cwd: __dirname,
      env: {
        WA_AUTH_DIR: '.baileys_auth_grupo',
        WA_MODE: 'group',
      },
    },
    {
      // Monitora DMs diretos recebidos no número 8008
      name: 'wa-dms',
      script: 'index.mjs',
      cwd: __dirname,
      env: {
        WA_AUTH_DIR: '.baileys_auth_dms',
        WA_MODE: 'dm',
        WA_PHONE: '5583996828008',
        PORT: '3001',
      },
    },
  ],
};
