/* eslint-disable */
function increaseTime(duration) {
  const id = Date.now();
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id,
    }, (err1) => {
      if (err1) {
        return reject(err1);
      }
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id + 1,
      }, (err2, res) => {
        return err2 ? reject(err2) : resolve(res);
      });
    });
  });
}
/* eslint-enable */

async function currentTimestamp() {
  const timestamp = Date.now();
  return Math.trunc(timestamp / 1000);
}

module.exports = {
  increaseTime,
  currentTimestamp,
  DAY: 3600 * 24,
};
