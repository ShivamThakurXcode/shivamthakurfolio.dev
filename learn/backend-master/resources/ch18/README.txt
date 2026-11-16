Chapter 18 labs (Node 22, npm i mongodb mongoose).
Throwaway single-node REPLICA SET (transactions need one), on a private port:

  docker run -d --name bmh-mongo-test -p 127.0.0.1:54330:27017 mongo:8.0.12 --replSet rs0 --bind_ip_all
  # wait ~10 s, then:
  docker exec bmh-mongo-test mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]}).ok'

Connect with:  mongodb://127.0.0.1:54330/?directConnection=true
Remove when done:  docker rm -f bmh-mongo-test
Note: 02-... waits 65 s for the TTL monitor.
