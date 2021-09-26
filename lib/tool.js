'use strict';

module.exports.type = (data) => {
  if (data === undefined || data === null) {
    return 'Null';
  }

  return data.constructor.name;
}