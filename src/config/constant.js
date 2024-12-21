const KEY = {
    DB_KEY:
        'nB5Wm32Qpyk8Y53ASd4H2GozbFJzrMQBfsAXgy53pW/Jx/OMcCqQlObGWsxFoA9FR+GLeyQnlh3Ph2S9/B+Gi/vWbJ9LZ2Guoal0qkS01UONqMgBxHhvX/NPru8kQupt3CrYSctUkM/IFJINSLJP2QXtymkEO3nHlcsS/u0yawo=',
};

const ROLE_RIGHTS = [
    'manageProfile',
    'getFiles',
    'manageFiles',
    'getUsers',
    'manageUsers',
    'getParties',
    'manageParties',
    'getPayments',
    'managePayments',
    'getAccounts',
    'manageAccounts',
    'manageDashboard'
]

const ACCESS_URL = [
    'http://192.168.20.108:3002',
    'http://192.168.1.9:3003',
    'http://192.168.1.13:3000',
    'http://192.168.20.108:3001',
    'http://localhost:3000', // Customer
    'http://localhost:3001', // Customer
    'http://localhost:3002', // Admin
    'http://localhost:3003', // Partner
    'http://localhost:3004', // Jarvis
    'http://localhost:3334',
    'https://buildercms.onrender.com',
    'https://parth1976.github.io'
];

const TENURE = {
    MONTHLY: 1,
    QUARTERLY: 2,
    HALF_YEARLY: 3,
    YEARLY: 4
};

const TENURE_MONTH = {
    1: 1, //Monthly
    2: 3, //Quarterly
    3: 6, //Half-yearly
    4: 12 //Yearly
};

const TENURE_MONTH_NAME = {
    1: 'Monthly',
    2: 'Quarterly',
    3: 'Half-yearly',
    4: 'Yearly'
};

const EMI_TYPE = {
    EMI: 1,
    MASTER_EMI: 2,
    DOWN_PAYMENT: 3
};

const PAYMENT_STATUS = {
    PENDING: 1,
    ON_TIME: 2,
    ADVANCE: 3,
    OVERDUE: 4,
    LATE_PAYED: 5,
};

const TRANSACTION_CONSTANTS = {
    DEBIT: 1,
    CREDIT: 2
};

const PAYMENT_MODE = {
    CHEQUE: 1,
    CASH: 2,
    ETRANSAFER: 3,
};

const TYPE_CONSTANTS = { 
    CASH: 1, 
    BANK: 2 
};

module.exports = {
    ROLE_RIGHTS,
    KEY,
    ACCESS_URL,
    TRANSACTION_CONSTANTS,
    PAYMENT_MODE,
    TYPE_CONSTANTS,
    TENURE,
    TENURE_MONTH,
    TENURE_MONTH_NAME,
    EMI_TYPE,
    PAYMENT_STATUS
};
