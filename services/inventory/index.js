/* Inventory micro-service */
require('dotenv').config();               // carrega .env (se existir)
const path        = require('path');
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const products    = require('./products.json');

const INVENTORY_PORT = process.env.INVENTORY_PORT || 3002;

/* ---------- gRPC setup ---------- */
const pkgDef = protoLoader.loadSync(
  path.join(__dirname, '../../proto/inventory.proto'),
  { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
);
const { inventory } = grpc.loadPackageDefinition(pkgDef);

const server = new grpc.Server();

/* ---------- Service impl ---------- */
function searchAllProducts(_, callback) {
  callback(null, { products });
}

function searchProductByID(call, callback) {
  const id = Number(call.request.id);
  if (Number.isNaN(id) || id <= 0) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      details: 'ID must be a positive integer',
    });
  }

  const product = products.find(p => p.id === id);
  if (!product) {
    return callback({
      code: grpc.status.NOT_FOUND,
      details: `Product ${id} not found`,
    });
  }

  callback(null, product);
}

server.addService(inventory.InventoryService.service, {
  SearchAllProducts : searchAllProducts,
  SearchProductByID : searchProductByID,
});

/* ---------- Start server ---------- */
server.bindAsync(
  `0.0.0.0:${INVENTORY_PORT}`,
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log(`[inventory] running on :${INVENTORY_PORT}`);
    server.start();
  }
);
