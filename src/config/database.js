const Sequelize = require("sequelize");

const sequelize = new Sequelize("infobalcao", "infobalcao", "admBancoD@dos2", {
    host: "infobalcao.mysql.dbaas.com.br",
    dialect: 'mysql'
})
sequelize.authenticate()
.then(function () {
    console.log("Conectado ao banco de dados da Locaweb com sucesso!")
}).catch(function() {
    console.log("Erro ao conectar com o banco de dados")
});

module.exports = sequelize;