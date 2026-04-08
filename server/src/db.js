import sql from "mssql";

let poolPromise;

export function getDbConfig() {
  const instanceName = process.env.MSSQL_INSTANCE;
  const port = process.env.MSSQL_PORT
    ? Number(process.env.MSSQL_PORT)
    : undefined;

  return {
    server: process.env.MSSQL_SERVER,
    port,
    database: process.env.MSSQL_DATABASE,
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    options: {
      encrypt: String(process.env.MSSQL_ENCRYPT).toLowerCase() === "true",
      trustServerCertificate:
        String(process.env.MSSQL_TRUST_SERVER_CERT).toLowerCase() === "true",
      instanceName: instanceName || undefined,
    },
  };
}

export async function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(getDbConfig());
  }
  return poolPromise;
}

export { sql };

