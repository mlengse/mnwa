const mysql = require('mysql')
//require('dotenv').config()

const {
	MYSQL_HOST,
	MYSQL_USER,
	MYSQL_PWD,
	MYSQL_DB
} = process.env

const pool = mysql.createPool({
	connectionLimit: 10,
	host: MYSQL_HOST,
	user: MYSQL_USER,
	password: MYSQL_PWD,
	database: MYSQL_DB
})

const getConnection = async () => {

	return await new Promise ( resolve => {
		pool.getConnection( async (err, connection) => {
			if(err) {
				console.error(`${new Date()} error: ${JSON.stringify(err.stack)}`)
				connection = await getConnection()
				resolve(connection)
			}
			connection.on('error', async (err) => {
				console.error(`${new Date()} db error: ${JSON.stringify(err)}`);
				if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
					connection = await getConnection()
					resolve(connection)                         // lost due to either server restart, or a
				} 
			});

			setInterval(function () {
				connection.query('SELECT 1');
			}, 5000);
			
			resolve(connection)
		})
	})
}

const connect = async (query) => {
	return await new Promise( resolve => {
		pool.getConnection( (err, connection) => {
			err ? console.error(`${new Date()} error: ${JSON.stringify(err.stack)}`) : '' //console.log(`connected id: ${connection.threadId}`);
			connection.query(query, (err, results, fields) => {
				err ? console.error(`${new Date()} error: ${JSON.stringify(err.stack)}`) : null;
				connection.release()
				resolve(results)
			})

		})
	
	})

}

module.exports = () => ({
	pool,
	getConnection,
	connect
})