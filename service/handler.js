'use strict';
const aws = require("aws-sdk");
const uuidv1 = require('uuid/v1');
const kms = new aws.KMS();
const s3 = new aws.S3();
const kmsAliasArn = process.env.KMS_ALIAS_ARN;
const pciBucket = process.env.PCI_BUCKET;
const encryptionContextUserName = process.env.ENCRYPTION_CONTEXT_USER_NAME;

module.exports.handle = (event, context, callback) => {
  const jsonBody = JSON.parse(event.body);
  const action = jsonBody.action;
  const value = jsonBody.value;

  if (action == "tokenize") {
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

  } else if (action == "destokenize") {
    getEncrypted(value)
      .then(encrypted => {
        decrypt(encrypted)
          .then(decrypted => {
            const response = {
              statusCode: 200,
              body: JSON.stringify({
                value: decrypted.toString("UTF-8")
              })
            };
            callback(null, response);  
          });
      });

  }

  

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

function getEncrypted(id) {
  return new Promise((resolve, reject) => {
    var getParams = {
      Bucket: pciBucket, 
      Key: id 
    }
    s3.getObject(getParams, function(err, data) {
      if (err) reject(err);
      else resolve(data.Body);
    });
  });
}

function decrypt(value) {
  return new Promise((resolve, reject) => {
    const decryptParams = {
      CiphertextBlob: value,
      EncryptionContext: {
        "UserName": encryptionContextUserName
      }
    }
    kms.decrypt(decryptParams, (err, data) => {
     if (err) reject(err);
     else resolve(data.Plaintext);
    });
  });
}
