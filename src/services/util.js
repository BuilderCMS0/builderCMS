/* eslint-disable no-const-assign */

module.exports = {
    toTitleCase(string) {
        return string.toString().replace(/\w\S*/g, function (t) { return t.charAt(0).toUpperCase() + t.substr(1).toLowerCase(); });
    },

    toCamelCase(string) {
        return string ? string.toLocaleLowerCase().replace(/[-_ ](.)/g, (_, char) => char.toUpperCase()) : "";
    },

    validateEmail(email) {
        return /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
    },

    validateMobile(mobile) {
        return /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im.test(mobile);
    },

    getOriginalToken(token) {
        // eslint-disable-next-line no-return-assign
        token = token.replace('Bearer', '');
        token = token.trim();
        return token;
    },

    cleanObject(obj) {
        const trimObj = Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined))
        return trimObj ? trimObj : {};
    }

};
