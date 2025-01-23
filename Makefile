build-inkvisitor:
	docker build --platform linux/amd64 -f Dockerfile -t dissinet/inkvisitor:latest --build-arg="ENV=production" . && docker push dissinet/inkvisitor:latest

build-inkvisitor-staging:
	docker build --platform linux/amd64 -f Dockerfile -t dissinet/inkvisitor:staging --build-arg="ENV=staging" . && docker push dissinet/inkvisitor:staging

build-inkvisitor-sandbox:
	docker build --platform linux/amd64 -f Dockerfile -t dissinet/inkvisitor:sandbox --build-arg="ENV=sandbox" . && docker push dissinet/inkvisitor:sandbox

build-niort:
	docker build --platform linux/amd64 -f Dockerfile -t dissinet/inkvisitor:niort --build-arg="ENV=niort" . && docker push dissinet/inkvisitor:niort