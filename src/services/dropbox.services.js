require('isomorphic-fetch'); // or another library of choice.
var Dropbox = require('dropbox').Dropbox;
require('dotenv').config({ path: "../../.env" });
var dbx = new Dropbox({ accessToken: process.env.ACCESS_TOKEN_DROPBOX });


async function uploadFile(path, contents) {
  dbx.filesUpload({
  path: path,
  contents: contents
})
.then(function(response) {
    console.log(response);
  })
  .catch(function(error) {
    console.log(error);
  });
}

/*
 CRIAR PASTA
dbx.filesCreateFolderV2({ path: '/files' })
  .then(function(response) {
    console.log(response);
  })
  .catch(function(error) {
    console.log(error);
  }); */

/* 
UPLOAD

dbx.filesUpload({
  path: '/files/arquivo.txt',
  contents: 'Olá Dropbox!'
});
.then(function(response) {
    console.log(response);
  })
  .catch(function(error) {
    console.log(error);
  });
*/
/*
LISTAR
dbx.filesListFolder({path: '/files'})
  .then(function(response) {
    console.log(response);
  })
  .catch(function(error) {
    console.log(error);
  });
*/

module.exports = { uploadFile };