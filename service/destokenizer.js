const aws = require("aws-sdk");
const uuidv1 = require('uuid/v1');
const kms = new aws.KMS();
const s3 = new aws.S3();
const kmsAliasArn = process.env.KMS_ALIAS_ARN;
const pciBucket = process.env.PCI_BUCKET;
const encryptionContextUserName = process.env.ENCRYPTION_CONTEXT_USER_NAME;

module.exports.handle = (event, context, callback) => {
  const jsonBody = JSON.parse(event.body);
  const token = jsonBody.token;

  get(token)
    .then(encryptedPan => {
      decrypt(encryptedPan)
        .then(pan => {
          success(pan, callback);  
        });
    });

};

function success(pan, callback) {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      pan: pan.toString("UTF-8")
    })
  };
  callback(null, response);    
}

function get(token) {
  return new Promise((resolve, reject) => {
    var getParams = {
      Bucket: pciBucket, 
      Key: token 
    }
    s3.getObject(getParams).promise()
      .then(data => resolve(data.Body))
      .catch(reject);
  });
}

function decrypt(encryptedPan) {
  return new Promise((resolve, reject) => {
    const decryptParams = {
      CiphertextBlob: encryptedPan,
      EncryptionContext: {
        "UserName": encryptionContextUserName
      }
    }
    kms.decrypt(decryptParams).promise()
      .then(data => resolve(data.Plaintext))
      .catch(reject);
  });
}
