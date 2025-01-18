const corsOptions = {
  origin: 'http://localhost:8080', // URL du frontend Flutter
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = corsOptions;
