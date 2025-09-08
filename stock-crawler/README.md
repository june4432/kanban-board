# 📈 네이버 와이즈리포트 투자분석 크롤러

네이버 와이즈리포트의 투자분석 데이터(수익성, 성장성, 안정성, 활동성)를 자동으로 크롤링하고 분석 가능한 형태로 변환하는 Python 도구입니다.

## ✨ 주요 기능

- 🎯 **4개 탭 자동 크롤링**: 수익성, 성장성, 안정성, 활동성 데이터
- 📅 **연간/분기 데이터 선택**: 라디오 버튼을 통한 기간별 데이터 수집
- 🔄 **자동 데이터 변환**: 컬럼 형태의 연도 데이터를 행(Row) 형태로 자동 변환
- 💎 **값 유형 분류**: (E) 표시 기준으로 Expected/Real 자동 분류
- 📊 **분석 데이터 매핑**: 전년대비(YoY), 전분기대비(QoQ) 등을 최신 기준일에 매핑
- ⏱️ **소요시간 추적**: 크롤링 시작/종료 시간 및 총 소요시간 자동 계산
- 🏗️ **계층 구조 파싱**: "펼치기" 기능이 있는 항목의 부모-자식 관계 자동 분석
- 🏢 **다중 회사 크롤링**: JSON 파일로 여러 회사를 한 번에 처리
- 🔧 **데이터 품질 보장**: 주식코드 6자리 문자열 유지, 데이터 타입 자동 추출

## 🚀 빠른 시작

### 1. 필수 패키지 설치

```bash
pip install -r requirements_playwright.txt
python -m playwright install
```

### 2. 단일 회사 크롤링

```bash
python playwright_stock_crawler.py
```

실행 시 연간/분기 선택 메뉴가 나타납니다:
- **연간**: 연간 재무데이터 수집
- **분기**: 분기별 재무데이터 수집

기본적으로 한솔홀딩스(004150) 데이터를 크롤링하고, **자동으로 분석 가능한 행(Row) 형태로 변환**하여 최종 CSV 파일 하나만 생성합니다.

### 3. 다중 회사 크롤링

```bash
# 연간 데이터 크롤링
python run_multiple_crawler_annual.py

# 분기 데이터 크롤링  
python run_multiple_crawler_quarter.py
```

각 스크립트는 `stocks.json` 파일의 회사 목록을 자동으로 읽어와서 크롤링하고, **모든 회사의 데이터를 통합하여 변환된 최종 CSV 파일 하나로 저장**합니다.

## 📊 출력 데이터 구조 (NEW!)

### 🔥 변환된 최종 CSV 파일

크롤러는 이제 **최종 변환된 CSV 파일 하나만** 생성합니다:

```
crawl_results/20250828_134901_financial_data_annual_transformed.csv
```

**컬럼 구조**:
```
company_code, company_name, tab, search_type, id, parent_id, item, 
column_name, column_type, yyyy, mm, value, value_type, data_type
```

**주요 특징**:
- `company_code`: 6자리 문자열 (예: "004150") 
- `search_type`: "연간" 또는 "분기"
- `column_type`: "year_data" (연도별 데이터) 또는 "analysis_data" (분석 데이터)
- `value_type`: "Real" (실제 데이터) 또는 "Expected" (예상 데이터, E 표시)
- `yyyy`, `mm`: 연도와 월로 분리된 날짜 정보
- `data_type`: "IFRS연결", "IFRS별도" 등 데이터 타입 자동 추출

### 💡 분석 데이터 특별 매핑

- **전년대비(YoY)**: 가장 최신 연도/월에 매핑 (예: 2025/12)
- **전분기대비(QoQ)**: 분기 조회시 가장 최신 분기에 매핑
- 이로써 분석 지표들이 해당 기간의 실제 기준점을 가지게 됩니다.

### ⏱️ 소요시간 추적

크롤링 과정에서 실시간으로 시간 추적:

```
🕐 크롤링 시작: 2025-08-28 13:48:05
🕐 크롤링 종료: 2025-08-28 13:49:01  
⏱️ 총 소요시간: 56초
```

## 📁 파일 구조

```
stock-crawler/
├── playwright_stock_crawler.py       # 🎯 메인 크롤러 (통합 버전)
├── run_multiple_crawler_annual.py    # 📅 연간 다중 크롤링
├── run_multiple_crawler_quarter.py   # 📅 분기 다중 크롤링  
├── requirements_playwright.txt       # 📦 필요한 패키지
├── stocks.json                       # 🏢 다중 크롤링용 회사 목록
├── crawl_results/                    # 📁 크롤링 결과 저장 폴더
│   ├── 20250828_134901_financial_data_annual_transformed.csv   # 최종 변환된 데이터
│   ├── all_companies_annual_transformed.csv                    # 다중 회사 통합 데이터
│   └── 20250828_crawling_summary.json                         # 크롤링 요약
└── README.md                         # 📖 이 파일
```

## 💼 사용법 상세

### 단일 회사 크롤링

가장 기본적인 사용법입니다:

```python
from playwright_stock_crawler import run_crawler

# 연간 데이터 크롤링 및 자동 변환
run_crawler("연간")

# 분기 데이터 크롤링 및 자동 변환  
run_crawler("분기")
```

**더 세밀한 제어를 원한다면**:

```python
import asyncio
from playwright_stock_crawler import PlaywrightStockCrawler

async def main():
    # 크롤러 초기화 (헤드리스 모드)
    crawler = PlaywrightStockCrawler(headless=True, wait_timeout=15000)
    crawler.start_timer()  # 타이머 시작
    
    # 한솔홀딩스 크롤링 (연간)
    url = "https://navercomp.wisereport.co.kr/v2/company/c1040001.aspx?cn=&cmp_cd=004150&menuType=block"
    results = await crawler.crawl_all_tabs(url, period_type="연간")
    
    if results:
        # 자동으로 변환된 DataFrame 가져오기
        combined_df = pd.concat(results, ignore_index=True)
        transformed_df = crawler.transform_to_row_format(combined_df)
        
        # CSV로 저장
        transformed_df.to_csv("output.csv", index=False, encoding='utf-8-sig')
    
    await crawler.close_browser()
    crawler.end_timer()  # 타이머 종료

# 실행
asyncio.run(main())
```

### 다중 회사 크롤링

여러 회사를 한 번에 크롤링하려면:

1. **JSON 파일 준비** (`stocks.json` 참고):
```json
[
  {
    "code": "004150",
    "name": "한솔홀딩스"
  },
  {
    "code": "010420", 
    "name": "한솔PNS"
  },
  {
    "code": "213500",
    "name": "한솔제지"
  }
]
```

2. **실행**:
```bash
# 연간 데이터 (모든 회사 통합하여 하나의 변환된 CSV로 저장)
python run_multiple_crawler_annual.py

# 분기 데이터 (모든 회사 통합하여 하나의 변환된 CSV로 저장)
python run_multiple_crawler_quarter.py
```

**프로그래밍 방식**:
```python
from playwright_stock_crawler import run_multiple_crawler

# JSON 파일에서 회사 목록을 읽어와 크롤링 + 자동 변환
run_multiple_crawler("stocks.json", "./crawl_results", "연간")
```

## 🔍 데이터 샘플

### 변환된 CSV 데이터 예시

```csv
company_code,company_name,tab,search_type,id,parent_id,item,column_name,column_type,yyyy,mm,value,value_type,data_type
004150,한솔홀딩스,수익성,연간,1,,매출총이익률,2024/12(IFRS연결),year_data,2024,12,15.2,Real,IFRS연결
004150,한솔홀딩스,수익성,연간,1,,매출총이익률,2025/12(E)(IFRS연결),year_data,2025,12,16.5,Expected,IFRS연결
004150,한솔홀딩스,수익성,연간,1,,매출총이익률,전년대비(YoY),analysis_data,2025,12,8.5,Real,YoY
```

**핵심 특징**:
- 📅 **날짜 분리**: `yyyy`, `mm` 컬럼으로 연도/월 분리
- 💎 **값 유형**: `Real` (실제) vs `Expected` (예상, E 표시)  
- 📊 **분석 매핑**: 전년대비(YoY) → 최신 기간(2025/12)에 매핑
- 🏷️ **데이터 타입**: 자동 추출된 IFRS연결, IFRS별도 등
- 📋 **컬럼 타입**: year_data (연도별) vs analysis_data (분석지표)

## 🔧 고급 설정

### 브라우저 모드 변경

```python
# 헤드리스 모드 (기본값, 빠름)
crawler = PlaywrightStockCrawler(headless=True)

# 화면 표시 모드 (디버깅용)
crawler = PlaywrightStockCrawler(headless=False)

# 대기 시간 조정
crawler = PlaywrightStockCrawler(wait_timeout=20000)  # 20초
```

### 사용자 정의 URL

다른 회사의 데이터를 크롤링하려면:

```python
# 삼성전자 예시
url = "https://navercomp.wisereport.co.kr/v2/company/c1040001.aspx?cn=&cmp_cd=005930&menuType=block"
```

### 데이터 변환 옵션

```python
# 변환된 데이터에서 특정 조건 필터링
transformed_df = crawler.transform_to_row_format(combined_df)

# 실제 데이터만 필터링
real_data = transformed_df[transformed_df['value_type'] == 'Real']

# 특정 연도만 필터링
year_2024 = transformed_df[transformed_df['yyyy'] == '2024']

# 분석 데이터만 필터링  
analysis_only = transformed_df[transformed_df['column_type'] == 'analysis_data']
```

## 🐛 문제 해결

### 자주 발생하는 오류

1. **`playwright` 명령어를 찾을 수 없음**:
   ```bash
   python -m playwright install
   ```

2. **크롤링 데이터가 없음**:
   - 네트워크 연결 확인
   - 대기 시간 증가: `wait_timeout=20000`

3. **변환된 데이터가 비어있음**:
   - 원본 데이터에 연도 컬럼이 있는지 확인
   - 'IFRS연결' 키워드가 포함된 컬럼이 있는지 확인

4. **타임스탬프 오류**:
   - `datetime` 모듈이 정상적으로 import되었는지 확인

### 디버깅 모드

```python
# 화면을 보면서 디버깅
crawler = PlaywrightStockCrawler(headless=False, wait_timeout=30000)

# 변환 과정 로그 확인
print("🔍 변환할 연도 컬럼들:", year_columns)
print("📈 변환할 분석 컬럼들:", analysis_columns)
```

## 📝 주요 특징

### 🔄 자동 데이터 변환 (NEW!)
- **컬럼 → 행 변환**: 연도별 컬럼을 개별 행으로 자동 변환
- **값 유형 자동 분류**: (E) 표시 기준으로 Expected/Real 자동 구분
- **분석 데이터 매핑**: YoY, QoQ 등을 최신 기준일에 자동 매핑
- **데이터 타입 추출**: IFRS연결, IFRS별도 등을 원본에서 자동 추출

### 🏗️ 계층 구조 파싱
- "펼치기" 텍스트가 있는 항목 → 상위 객체 (parent_id = null)
- "펼치기" 텍스트가 없는 항목 → 하위 객체 (가장 가까운 상위 항목을 parent_id로 설정)

### ⏱️ 성능 모니터링
- **실시간 시간 추적**: 크롤링 시작/종료 시간 자동 기록
- **소요시간 계산**: 시, 분, 초 단위로 자동 계산 및 표시
- **진행상황 로깅**: 각 단계별 상세한 진행상황 실시간 출력

### 🔧 안정적인 크롤링
- **키워드 기반 테이블 식별**: 매출총이익률, 부채비율 등 키워드로 정확한 테이블 선택
- **자동 재시도 로직**: 네트워크 오류 시 자동 재시도
- **회사 간 대기 시간**: 서버 부하 방지를 위한 적절한 대기
- **통합 워크플로우**: 크롤링 → 변환 → 저장을 하나의 프로세스로 통합

## 🚀 최신 업데이트 (v2.0)

### ✨ 주요 신기능
- 🔄 **완전 자동화된 데이터 변환**: 크롤링 후 즉시 분석 가능한 형태로 변환
- 💎 **값 유형 자동 분류**: Expected/Real 구분으로 예상값과 실제값 명확히 구분
- 📊 **스마트 분석 데이터 매핑**: YoY, QoQ를 최신 기준일에 자동 매핑
- ⏱️ **실시간 성능 모니터링**: 시작/종료 시간 및 소요시간 자동 추적
- 🎯 **단일 파일 출력**: 중간 파일 없이 최종 변환된 CSV 파일만 생성

### 🛠️ 개선사항
- 더 정확한 데이터 타입 추출 (IFRS연결, IFRS별도 등)
- 주식코드 6자리 문자열 보장
- 연도/월 분리로 더 나은 시계열 분석 지원
- 통합된 워크플로우로 사용 편의성 대폭 향상

## 📄 라이선스

이 프로젝트는 개인 및 교육 목적으로 자유롭게 사용할 수 있습니다.

## 🤝 기여

버그 리포트나 기능 개선 제안은 언제든 환영합니다!

---

**🎯 개발 목표**: 네이버 와이즈리포트의 투자분석 데이터를 효율적이고 안정적으로 수집하고, **즉시 분석 가능한 형태로 변환**하여 투자 의사결정을 지원합니다.
