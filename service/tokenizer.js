const aws = require("aws-sdk");
const uuidv1 = require('uuid/v1');
const kms = new aws.KMS();
const s3 = new aws.S3();
const kmsAliasArn = process.env.KMS_ALIAS_ARN;
const pciBucket = process.env.PCI_BUCKET;
const encryptionContextUserName = process.env.ENCRYPTION_CONTEXT_USER_NAME;

module.exports.handle = (event, context, callback) => {
  const jsonBody = JSON.parse(event.body);
  const pan = jsonBody.pan;  
  const uuid = uuidv1();
  encrypt(pan).then(encryptedPan => {
    save(encryptedPan, uuid).then(saved => {
      success(uuid, callback);
    });
  });
};

function encrypt(pan) {
  return new Promise((resolve, reject) => {
    const params = {
     KeyId: kmsAliasArn,
     Plaintext: pan,
     EncryptionContext: {
       "UserName": encryptionContextUserName
     }
    };
    kms.encrypt(params).promise()
      .then(data => resolve(data.CiphertextBlob))
      .catch(reject);
  });  
}

function save(encryptedPan, uuid) {
  return new Promise((resolve, reject) => {
    var params = {
      Body: encryptedPan, 
      Bucket: pciBucket, 
      Key: uuid, 
      ServerSideEncryption: "AES256"
    };
    s3.putObject(params).promise()
      .then(resolve)
      .catch(reject);
  });
}

function success(uuid, callback) {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      token: uuid
    })
  };
  callback(null, response);  
}