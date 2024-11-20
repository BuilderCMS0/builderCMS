const tokenTypes = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  RESET_PASSWORD: 'resetPassword',
  SOCIAL_LOGIN: 'socialLogin',
  MSCAN: 'mScan'
};

const loginTypes = {
  WEB: 1,
  EXE: 2,
  MOBILE: 3,
  PACKAGE: 4
}

module.exports = {
  tokenTypes,
  loginTypes
};
