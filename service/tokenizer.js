const aws = require("aws-sdk");
const uuidv1 = require('uuid/v1');
const kms = new aws.KMS();
const s3 = new aws.S3();
const kmsAliasArn = process.env.KMS_ALIAS_ARN;
const pciBucket = process.env.PCI_BUCKET;
const encryptionContextUserName = process.env.ENCRYPTION_CONTEXT_USER_NAME;

module.exports.handle = (event, context, callback) => {
  const jsonBody = JSON.parse(event.body);
  const value = jsonBody.value;

  
  const uuid = uuidv1();
  encrypt(value)
    .then(encrypted => {
      saveEncrypted(encrypted, uuid);
    });
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      value: uuid
    })
  };
  callback(null, response);  

};


function encrypt(value) {
  return new Promise((resolve, reject) => {
    const params = {
     KeyId: kmsAliasArn,
     Plaintext: value,
     EncryptionContext: {
       "UserName": encryptionContextUserName
     }
    };
    kms.encrypt(params, (err, data) => {
     if (err) reject(err);
     else resolve(data.CiphertextBlob);
    }); 
  });  
}

function saveEncrypted(encrypted, id) {
  return new Promise((resolve, reject) => {
    var params = {
      Body: encrypted, 
      Bucket: pciBucket, 
      Key: id, 
      ServerSideEncryption: "AES256"
    };
    s3.putObject(params, function(err, data) {
      if (err) reject(err); 
      else resolve(data); 
    });
  });
}
