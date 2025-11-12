# Docker PostgreSQL 설정 가이드

## 1단계: Docker Desktop 시작

Docker Desktop 애플리케이션을 시작해주세요.

## 2단계: PostgreSQL 컨테이너 시작

터미널에서 다음 명령어를 실행하세요:

```bash
./scripts/start-postgres-docker.sh
```

또는 직접 Docker 명령어를 사용할 수 있습니다:

```bash
docker run --name kanban-postgres \
  -e POSTGRES_PASSWORD=kanban_dev_2024 \
  -e POSTGRES_DB=kanban \
  -p 5432:5432 \
  -v "$(pwd)/data/postgres":/var/lib/postgresql/data \
  -d postgres:15
```

## 3단계: .env 파일 업데이트

`.env` 파일에서 `DATABASE_TYPE`을 `postgres`로 변경하세요:

```bash
DATABASE_TYPE=postgres
```

## 4단계: 데이터 마이그레이션 실행

```bash
npm run migrate:to-postgres
```

## 5단계: 애플리케이션 재시작

```bash
npm run dev
```

## 유용한 Docker 명령어

### 컨테이너 상태 확인
```bash
docker ps -a | grep kanban-postgres
```

### 컨테이너 로그 확인
```bash
docker logs kanban-postgres
```

### 컨테이너 중지
```bash
docker stop kanban-postgres
```

### 컨테이너 재시작
```bash
docker start kanban-postgres
```

### 컨테이너 삭제 (데이터 유지됨)
```bash
docker stop kanban-postgres
docker rm kanban-postgres
```

### PostgreSQL 접속 (psql)
```bash
docker exec -it kanban-postgres psql -U postgres -d kanban
```

## 데이터 위치

PostgreSQL 데이터는 다음 로컬 디렉토리에 저장됩니다:
```
./data/postgres/
```

이 디렉토리를 백업하면 모든 데이터가 보존됩니다.

## 문제 해결

### 포트 충돌 (5432 이미 사용 중)
다른 PostgreSQL이 이미 실행 중일 수 있습니다:
```bash
lsof -i :5432
```

### 권한 문제
데이터 디렉토리 권한 확인:
```bash
ls -la data/postgres
```

### 컨테이너가 시작되지 않음
로그 확인:
```bash
docker logs kanban-postgres
```
