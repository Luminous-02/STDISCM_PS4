# stdiscm-grp

## Media Upload Simulator

Place videos in `/data` folder

To install npm:
`cd media-upload-simu`

<br>

`npm i`

To run:
`npm run consumer -- --c=3 --q=5 --grpcPort=50051 --httpPort=8080 --storage=consumer/storage`

<br>

`npm run producer -- --host=127.0.0.1:50051 --p=3 --folders=./data/p1,./data/p2,./data/p3`
