Chapter 20 labs. Needs the Chapter 15 container (bmh-pg-test, pg_trgm in public) and: npm i pg @duckdb/node-api
01: run with  docker exec -i bmh-pg-test psql -U postgres -d shopline -X -q < 01-postgres-fulltext.sql   (creates schema ch20; ~1 min)
02: partitioning (2M rows; ~1 min).   Run 01 first (it creates the schema).
03: Elasticsearch 8.15 single node, security off, 512 MB heap:
    docker run -d --name bmh-es-test -p 127.0.0.1:54340:9200 -e discovery.type=single-node -e xpack.security.enabled=false -e ES_JAVA_OPTS="-Xms512m -Xmx512m" docker.elastic.co/elasticsearch/elasticsearch:8.15.0
    (wait until http://127.0.0.1:54340/_cluster/health says green)   then: node 03-elasticsearch.mjs
04: export first:  docker exec bmh-pg-test psql -U postgres -d shopline -X -q -c "copy (select id,user_id,status,total_minor,created_at from ch15.orders) to stdout csv header" > orders.csv
    then node 04-duckdb-columnar.mjs
Cleanup: docker rm -f bmh-es-test
