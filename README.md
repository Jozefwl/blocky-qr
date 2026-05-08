# How to install / run

run npm safe install (or npm install --ignore-scripts) in these directories:
- blocky-qr/qr-backend
- blocky-qr/qr-frontend
- blocky-qr/qr-computation-module

Applications have dotenv_template file which requires the following:
- MongoDB connection
- RabbitMQ connection

If you do not have a RabbitMQ connection, the pipeline will fail that RabbitMQ is unreachable.