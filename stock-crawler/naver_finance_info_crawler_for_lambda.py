"""
네이버 금융 PER/EPS 정보 크롤러 - AWS Lambda용
네이버 금융 종목정보 페이지에서 투자정보 탭의 PER/EPS 데이터를 크롤링합니다.
Lambda 환경에서 실행되며 결과를 JSON 형태로 반환합니다.
"""

import asyncio
import json
from datetime import datetime
import re
from playwright.async_api import async_playwright


class NaverFinancePERCrawlerForLambda:
    def __init__(self, headless=True, wait_timeout=15000):
        """
        네이버 금융 PER/EPS 크롤러 초기화 (Lambda용)
        
        Args:
            headless (bool): 브라우저를 백그라운드에서 실행할지 여부
            wait_timeout (int): 요소 대기 시간 (밀리초)
        """
        self.headless = headless
        self.wait_timeout = wait_timeout
        self.browser = None
        self.page = None
        self.start_time = None
        self.end_time = None
    
    def start_timer(self):
        """크롤링 시작 시간 기록"""
        self.start_time = datetime.now()
        timestamp = self.start_time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"🕐 PER/EPS 크롤링 시작: {timestamp}")
        
    def end_timer(self):
        """크롤링 종료 시간 기록 및 소요시간 계산"""
        self.end_time = datetime.now()
        timestamp = self.end_time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"🕐 PER/EPS 크롤링 종료: {timestamp}")
        
        if self.start_time:
            duration = self.end_time - self.start_time
            total_seconds = int(duration.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            
            if hours > 0:
                print(f"⏱️ 총 소요시간: {hours}시간 {minutes}분 {seconds}초")
            elif minutes > 0:
                print(f"⏱️ 총 소요시간: {minutes}분 {seconds}초")
            else:
                print(f"⏱️ 총 소요시간: {seconds}초")
    
    async def initialize_browser(self):
        """브라우저 초기화"""
        try:
            print("▶ [1/4] Playwright_async starting...") # 로그 추가
            self.playwright = await async_playwright().start()
            print("▶ [2/4] Playwright_async started successfully.") # 로그 추가

            print(f"▶ [3/4] Launching browser with args: {self.browser_args}") # 로그 추가 (args 변수화 필요)
            self.browser = await self.playwright.chromium.launch(
                headless=self.headless,
                args=[ # self.browser_args로 대체해도 좋습니다.
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-blink-features=AutomationControlled'
                ]
            )
            print("▶ [4/4] Browser launched successfully.") # 로그 추가

            # --- 여기서 오류 발생 ---
            print("▶ [5/5] Creating new page...") # 로그 추가
            self.page = await self.browser.new_page()
            print("▶ [6/6] New page created successfully.") # 로그 추가

            # ... (생략) ...

        except Exception as e:
            # 오류 발생 시 더 자세한 스택 트레이스를 출력하도록 수정
            import traceback
            print(f"❌ 브라우저 초기화 실패: {str(e)}")
            print(traceback.format_exc()) # 스택 트레이스 전체 출력
            return False
    
    async def close_browser(self):
        """브라우저 종료"""
        try:
            if self.page:
                await self.page.close()
            if self.browser:
                await self.browser.close()
            if hasattr(self, 'playwright'):
                await self.playwright.stop()
            print("✅ 브라우저 종료 완료")
        except Exception as e:
            print(f"❌ 브라우저 종료 중 오류: {str(e)}")
    
    async def crawl_per_eps_data(self, stock_code="004150", company_name="한솔홀딩스"):
        """
        네이버 금융에서 PER/EPS 정보 크롤링
        
        Args:
            stock_code (str): 주식코드 (예: "004150")
            company_name (str): 회사명
            
        Returns:
            dict: 크롤링된 PER/EPS 데이터
        """
        url = f"https://finance.naver.com/item/main.naver?code={stock_code}"
        
        try:
            print(f"📊 {company_name}({stock_code}) PER/EPS 데이터 크롤링 시작...")
            print(f"🔗 URL: {url}")
            
            # 페이지 이동
            await self.page.goto(url, wait_until="networkidle")
            await asyncio.sleep(3)
            
            # 동적 데이터 로딩을 위한 추가 대기
            print("⏳ 동적 데이터 로딩 대기 중...")
            await asyncio.sleep(2)
            
            # 동적 PBR/PER 값들을 직접 가져오기
            print("🔍 동적 PBR/PER 값 확인 중...")
            dynamic_values = {}
            try:
                # 특정 ID로 동적 값들 가져오기
                target_ids = ['_per', '_pbr', '_eps', '_bps']
                for target_id in target_ids:
                    try:
                        element = await self.page.query_selector(f'#{target_id}')
                        if element:
                            text = await element.inner_text()
                            dynamic_values[target_id] = text.strip()
                            print(f"🎯 {target_id}: {text.strip()}")
                    except Exception as e:
                        print(f"⚠️ {target_id} 검색 중 오류: {str(e)}")
                
                print(f"✅ 동적 값 수집 완료: {dynamic_values}")
                
            except Exception as e:
                print(f"⚠️ 동적 요소 검색 중 오류: {str(e)}")
            
            # 페이지 구조 디버깅
            print("🔍 페이지 구조 분석 중...")
            
            # aside_invest_info div 찾기
            print("🔍 투자정보 영역 찾는 중...")
            aside_invest_info = await self.page.query_selector('#aside_invest_info')
            
            if not aside_invest_info:
                print("❌ aside_invest_info를 찾을 수 없습니다.")
                
                # PER 키워드가 포함된 테이블들 직접 찾기
                print("🔍 PER 키워드가 포함된 테이블들 찾는 중...")
                all_tables = await self.page.query_selector_all('table')
                per_tables = []
                for i, table in enumerate(all_tables):
                    summary = await table.get_attribute('summary')
                    if summary and ('PER' in summary or 'EPS' in summary):
                        per_tables.append((i, table, summary))
                        print(f"   테이블 {i}: summary='{summary}'")
                
                if per_tables:
                    print(f"✅ PER/EPS 관련 테이블 {len(per_tables)}개 발견!")
                    # 첫 번째 PER/EPS 테이블 사용
                    _, selected_table, selected_summary = per_tables[0]
                    print(f"🎯 선택된 테이블: {selected_summary}")
                    return await self.extract_table_data(selected_table, stock_code, company_name, dynamic_values)
                else:
                    print("❌ PER/EPS 관련 테이블을 찾을 수 없습니다.")
                    return None
            
            print("✅ 투자정보 영역 발견")
            
            # PER/EPS 정보 테이블 찾기
            print("🔍 PER/EPS 정보 테이블 찾는 중...")
            per_eps_table = await aside_invest_info.query_selector('table[summary="PER/EPS 정보"]')
            
            if not per_eps_table:
                print("❌ PER/EPS 정보 테이블을 찾을 수 없습니다.")
                # 모든 테이블 확인해보기
                print("🔍 투자정보 영역 내 사용 가능한 테이블들:")
                tables = await aside_invest_info.query_selector_all('table')
                for i, table in enumerate(tables):
                    summary = await table.get_attribute('summary')
                    print(f"   테이블 {i+1}: summary='{summary}'")
                return None
            
            print("✅ PER/EPS 정보 테이블 발견")
            
            # 테이블 데이터 추출
            return await self.extract_table_data(per_eps_table, stock_code, company_name, dynamic_values)
            
        except Exception as e:
            print(f"❌ 크롤링 중 오류 발생: {str(e)}")
            return None
    
    async def extract_table_data(self, table, stock_code, company_name, dynamic_values=None):
        """
        테이블에서 PER/EPS 데이터 추출
        
        Args:
            table: Playwright 테이블 요소
            stock_code (str): 주식코드
            company_name (str): 회사명
            dynamic_values (dict): 동적으로 가져온 PER/PBR 값들
            
        Returns:
            dict: 추출된 데이터
        """
        try:
            print("📋 테이블 데이터 추출 중...")
            
            # 테이블의 모든 행 가져오기
            rows = await table.query_selector_all('tr')
            
            data = {
                'stock_code': stock_code,
                'company_name': company_name,
                'crawl_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'per_eps_data': []
            }
            
            for row_idx, row in enumerate(rows):
                # 각 행의 셀들 가져오기
                cells = await row.query_selector_all('td, th')
                
                if len(cells) >= 2:  # 최소 2개 이상의 셀이 있어야 의미있는 데이터
                    row_data = []
                    for cell in cells:
                        cell_text = await cell.inner_text()
                        cell_text = cell_text.strip()
                        row_data.append(cell_text)
                    
                    if row_data and any(text for text in row_data):  # 빈 행이 아닌 경우만
                        data['per_eps_data'].append({
                            'row_index': row_idx,
                            'cells': row_data
                        })
                        print(f"   행 {row_idx}: {' | '.join(row_data)}")
            
            print(f"✅ 총 {len(data['per_eps_data'])}개 행의 데이터 추출 완료")
            
            return data
            
        except Exception as e:
            print(f"❌ 테이블 데이터 추출 중 오류: {str(e)}")
            return None
    
    def parse_per_eps_data(self, data):
        """
        PER/EPS 데이터를 구조화된 형태로 파싱
        각 항목을 개별 행으로 분리 (PER|EPS -> PER 행, EPS 행)
        
        Args:
            data (dict): 원본 크롤링 데이터
            
        Returns:
            list: 파싱된 구조화된 데이터
        """
        parsed_data = []
        
        for row_data in data['per_eps_data']:
            if len(row_data['cells']) >= 2:
                item_name = row_data['cells'][0].strip()
                item_value = row_data['cells'][1].strip()
                
                # "l"로 구분된 값들 분리
                if 'l' in item_value:
                    value_parts = item_value.split('l')
                    left_value = value_parts[0].strip()
                    right_value = value_parts[1].strip() if len(value_parts) > 1 else ""
                else:
                    left_value = item_value
                    right_value = ""
                
                # 항목명에서 날짜 정보 추출
                date_match = re.search(r'\((\d{4}\.\d{2})\)', item_name)
                date_info = date_match.group(1) if date_match else ""
                
                # 항목명 정리 (날짜 정보 제거)
                clean_item_name = re.sub(r'\(\d{4}\.\d{2}\)', '', item_name).strip()
                
                # "l"로 구분된 항목명 처리하여 각각을 개별 행으로 분리
                if 'l' in clean_item_name:
                    name_parts = clean_item_name.split('l')
                    main_item = name_parts[0].strip()
                    sub_item = name_parts[1].strip() if len(name_parts) > 1 else ""
                    
                    # 배당수익률의 경우 날짜 필드는 저장하지 않음
                    if main_item == "배당수익률":
                        # 날짜 정보를 항목명에서 추출하되, 별도 행으로 저장하지 않음
                        date_match_from_sub = re.search(r'\d{4}\.\d{2}', sub_item)
                        extracted_date = date_match_from_sub.group() if date_match_from_sub else date_info
                        
                        parsed_data.append({
                            'stock_code': data['stock_code'],
                            'company_name': data['company_name'],
                            'crawl_time': data['crawl_time'],
                            'item_type': main_item,
                            'item_category': 'main',
                            'date_info': extracted_date,
                            'value': left_value,
                            'unit': self._extract_unit(left_value),
                            'numeric_value': self._extract_numeric_value(left_value),
                            'raw_item_name': item_name,
                            'raw_item_value': item_value,
                            'original_row_index': row_data['row_index']
                        })
                    else:
                        # 기존 로직: PER/EPS 등은 두 개의 행으로 분리
                        # 첫 번째 항목 (예: PER, 추정PER)
                        parsed_data.append({
                            'stock_code': data['stock_code'],
                            'company_name': data['company_name'],
                            'crawl_time': data['crawl_time'],
                            'item_type': main_item,
                            'item_category': 'main',
                            'date_info': date_info,
                            'value': left_value,
                            'unit': self._extract_unit(left_value),
                            'numeric_value': self._extract_numeric_value(left_value),
                            'raw_item_name': item_name,
                            'raw_item_value': item_value,
                            'original_row_index': row_data['row_index']
                        })
                        
                        # 두 번째 항목 (예: EPS, 추정EPS)
                        if sub_item:
                            # "추정PER"의 경우 sub_item을 "추정EPS"로 변경
                            if main_item == "추정PER" and sub_item == "EPS":
                                sub_item = "추정EPS"
                            
                            parsed_data.append({
                                'stock_code': data['stock_code'],
                                'company_name': data['company_name'],
                                'crawl_time': data['crawl_time'],
                                'item_type': sub_item,
                                'item_category': 'sub',
                                'date_info': date_info,
                                'value': right_value,
                                'unit': self._extract_unit(right_value),
                                'numeric_value': self._extract_numeric_value(right_value),
                                'raw_item_name': item_name,
                                'raw_item_value': item_value,
                                'original_row_index': row_data['row_index']
                            })
                else:
                    # "l"로 구분되지 않은 단일 항목
                    parsed_data.append({
                        'stock_code': data['stock_code'],
                        'company_name': data['company_name'],
                        'crawl_time': data['crawl_time'],
                        'item_type': clean_item_name,
                        'item_category': 'single',
                        'date_info': date_info,
                        'value': left_value,
                        'unit': self._extract_unit(left_value),
                        'numeric_value': self._extract_numeric_value(left_value),
                        'raw_item_name': item_name,
                        'raw_item_value': item_value,
                        'original_row_index': row_data['row_index']
                    })
        
        return parsed_data
    
    def _extract_unit(self, value_str):
        """값에서 단위 추출 (배, 원, % 등)"""
        if not value_str or value_str == 'N/A':
            return ""
        
        # 일반적인 단위들 찾기
        units = ['배', '원', '%', '억원', '만원']
        for unit in units:
            if unit in value_str:
                return unit
        return ""
    
    def _extract_numeric_value(self, value_str):
        """값에서 숫자 부분만 추출"""
        if not value_str or value_str == 'N/A':
            return None
        
        # 숫자와 소수점, 콤마만 추출
        numeric_match = re.search(r'[\d,]+\.?\d*', value_str.replace(',', ''))
        if numeric_match:
            try:
                return float(numeric_match.group().replace(',', ''))
            except ValueError:
                return None
        return None




async def run_batch_per_eps_crawler_for_lambda(stocks, headless=True, delay_between_stocks=2):
    """
    Lambda용 배치 PER/EPS 크롤러 실행 함수
    
    Args:
        stocks (list): 종목 정보 리스트 [{"code": "004150", "name": "한솔홀딩스"}, ...]
        headless (bool): 헤드리스 모드 여부
        delay_between_stocks (int): 종목 간 대기 시간 (초)
        
    Returns:
        dict: 배치 크롤링 결과 JSON 데이터
    """
    crawler = NaverFinancePERCrawlerForLambda(headless=headless)
    crawler.start_timer()
    
    all_results = []
    successful_count = 0
    failed_count = 0
    
    try:
        # 브라우저 초기화 (한 번만 초기화하여 재사용)
        if not await crawler.initialize_browser():
            return {"success": False, "error": "브라우저 초기화 실패"}
        
        print(f"🚀 총 {len(stocks)}개 종목 배치 크롤링 시작")
        print("=" * 60)
        
        for idx, stock in enumerate(stocks, 1):
            stock_code = stock.get('code', '')
            company_name = stock.get('name', '')
            
            print(f"[{idx}/{len(stocks)}] {company_name}({stock_code}) 크롤링 중...")
            
            try:
                # 개별 종목 크롤링
                data = await crawler.crawl_per_eps_data(stock_code, company_name)
                
                if data:
                    parsed_data = crawler.parse_per_eps_data(data)
                    all_results.append({
                        "stock_code": stock_code,
                        "company_name": company_name,
                        "success": True,
                        "raw_data": data,
                        "parsed_data": parsed_data
                    })
                    successful_count += 1
                    print(f"✅ {company_name}({stock_code}) 크롤링 성공")
                else:
                    all_results.append({
                        "stock_code": stock_code,
                        "company_name": company_name,
                        "success": False,
                        "error": "데이터를 가져올 수 없습니다"
                    })
                    failed_count += 1
                    print(f"❌ {company_name}({stock_code}) 크롤링 실패")
                
            except Exception as e:
                all_results.append({
                    "stock_code": stock_code,
                    "company_name": company_name,
                    "success": False,
                    "error": str(e)
                })
                failed_count += 1
                print(f"❌ {company_name}({stock_code}) 크롤링 중 오류: {str(e)}")
            
            # 종목 간 딜레이 (마지막 종목이 아닌 경우에만)
            if idx < len(stocks) and delay_between_stocks > 0:
                print(f"⏳ {delay_between_stocks}초 대기 중...")
                await asyncio.sleep(delay_between_stocks)
        
        # 최종 결과
        result = {
            "success": True,
            "batch_info": {
                "total_stocks": len(stocks),
                "successful_count": successful_count,
                "failed_count": failed_count,
                "success_rate": f"{(successful_count/len(stocks)*100):.1f}%",
                "crawl_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            },
            "results": all_results
        }
        
        print("\n" + "=" * 60)
        print("🎉 배치 크롤링 완료!")
        print(f"📊 총 종목 수: {len(stocks)}")
        print(f"✅ 성공: {successful_count}개")
        print(f"❌ 실패: {failed_count}개")
        print(f"📈 성공률: {(successful_count/len(stocks)*100):.1f}%")
        print("=" * 60)
        print("📊 배치 크롤링 결과 JSON:")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print("=" * 60)
        
        return result
        
    except Exception as e:
        return {"success": False, "error": f"배치 크롤링 중 오류: {str(e)}"}
    
    finally:
        await crawler.close_browser()
        crawler.end_timer()


# Lambda 핸들러 함수
def lambda_handler(event, context):
    """
    AWS Lambda 핸들러 함수 - stocks.json 파일 기반 배치 크롤링
    
    Args:
        event (dict): Lambda 이벤트 데이터
        context: Lambda 컨텍스트
        
    Returns:
        dict: HTTP 응답
    """
    try:
        # stocks.json 파일에서 종목 리스트 로드
        try:
            with open('stocks.json', 'r', encoding='utf-8') as f:
                stocks = json.load(f)
            print(f"📋 stocks.json에서 {len(stocks)}개 종목 로드 완료")
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                'body': json.dumps({
                    'success': False,
                    'error': f'stocks.json 파일 로드 실패: {str(e)}'
                }, ensure_ascii=False, indent=2)
            }
        
        # 배치 크롤링 실행
        print("🚀 stocks.json 기반 배치 크롤링 시작")
        delay_between_stocks = event.get('delay_between_stocks', 2)
        
        result = asyncio.run(run_batch_per_eps_crawler_for_lambda(
            stocks=stocks,
            headless=True,
            delay_between_stocks=delay_between_stocks
        ))
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json; charset=utf-8'
            },
            'body': json.dumps(result, ensure_ascii=False, indent=2)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json; charset=utf-8'
            },
            'body': json.dumps({
                'success': False,
                'error': f'Lambda 실행 중 오류: {str(e)}'
            }, ensure_ascii=False, indent=2)
        }


if __name__ == "__main__":
    print("🚀 네이버 금융 투자정보 크롤러 (Lambda용) - stocks.json 배치 테스트")
    print("=" * 50)
    
    # stocks.json 파일 기반 배치 테스트
    try:
        with open('stocks.json', 'r', encoding='utf-8') as f:
            stocks = json.load(f)
        print(f"📋 stocks.json에서 {len(stocks)}개 종목 로드")
        
        print("📊 배치 크롤링 테스트 시작")
        result = asyncio.run(run_batch_per_eps_crawler_for_lambda(
            stocks=stocks,
            headless=True,
            delay_between_stocks=2
        ))
        
        if result.get("success"):
            print("✅ Lambda용 배치 크롤러 테스트 성공!")
            print(f"📈 성공률: {result['batch_info']['success_rate']}")
        else:
            print("❌ Lambda용 배치 크롤러 테스트 실패!")
            print(f"🚨 오류: {result.get('error', '알 수 없는 오류')}")
            
    except FileNotFoundError:
        print("❌ stocks.json 파일을 찾을 수 없습니다.")
    except Exception as e:
        print(f"❌ 테스트 실행 중 오류: {str(e)}")