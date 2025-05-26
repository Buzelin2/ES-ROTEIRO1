/* Controller API (gateway) */
require('dotenv').config();
const path         = require('path');
const util         = require('util');
const express      = require('express');
const morgan       = require('morgan');
const grpc         = require('@grpc/grpc-js');
const protoLoader  = require('@grpc/proto-loader');

const PORT            = process.env.PORT || 3000;
const SHIPPING_PORT   = process.env.SHIPPING_PORT   || 3001;
const INVENTORY_PORT  = process.env.INVENTORY_PORT  || 3002;

/* ---------- helpers ---------- */
function loadGrpcClient(protoRelPath, serviceFqn, target) {
  const def  = protoLoader.loadSync(
    path.join(__dirname, protoRelPath),
    { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
  );
  const pkg  = grpc.loadPackageDefinition(def);
  const srv  = serviceFqn.split('.').reduce((o, k) => o[k], pkg);
  return new srv(target, grpc.credentials.createInsecure());
}

function promisifyAll(grpcClient) {
  for (const m of Object.keys(Object.getPrototypeOf(grpcClient))) {
    if (typeof grpcClient[m] === 'function') {
      grpcClient[m + 'Async'] = util.promisify(grpcClient[m].bind(grpcClient));
    }
  }
  return grpcClient;
}

/* ---------- gRPC clients ---------- */
const inventory = promisifyAll(
  loadGrpcClient('../../proto/inventory.proto', 'inventory.InventoryService', `localhost:${INVENTORY_PORT}`)
);
const shipping  = promisifyAll(
  loadGrpcClient('../../proto/shipping.proto',  'shipping.ShippingService',  `localhost:${SHIPPING_PORT}`)
);

/* ---------- Express app ---------- */
const app = express();
app.use(morgan('dev'));

/* list all products */
app.get('/products', async (_req, res, next) => {
  try {
    const reply = await inventory.SearchAllProductsAsync({});
    res.json(reply);
  } catch (e) { next(e); }
});

/* single product */
app.get('/product/:id', async (req, res, next) => {
  try {
    const product = await inventory.SearchProductByIDAsync({ id: req.params.id });
    res.json(product);
  } catch (e) { next(e); }
});

/* shipping price */
app.get('/shipping/:cep', async (req, res, next) => {
  try {
    const reply = await shipping.GetShippingRateAsync({ cep: req.params.cep });
    res.json(reply);
  } catch (e) { next(e); }
});

/* ---------- Error handler ---------- */
app.use((err, _req, res, _next) => {
  const status = err.code && err.code >= 100 && err.code < 600 ? err.code : 500;
  res.status(status).json({ error: err.details || err.message || 'Internal error' });
});

/* ---------- Start HTTP ---------- */
app.listen(PORT, () => console.log(`[controller] API listening on :${PORT}`));
