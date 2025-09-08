"""
Playwright를 사용한 한솔홀딩스 투자분석 데이터 크롤러
더 빠르고 안정적인 크롤링을 위해 Playwright 사용
"""

import asyncio
import pandas as pd
from playwright.async_api import async_playwright
import json
import time
from datetime import datetime
import os
import re

class PlaywrightStockCrawler:
    def __init__(self, headless=True, wait_timeout=10000):
        """
        Playwright 크롤러 초기화
        
        Args:
            headless (bool): 브라우저를 백그라운드에서 실행할지 여부 (기본값: True for Lambda)
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
        print(f"🕐 크롤링 시작: {timestamp}")
        
    def end_timer(self):
        """크롤링 종료 시간 기록 및 소요시간 계산"""
        self.end_time = datetime.now()
        timestamp = self.end_time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"🕐 크롤링 종료: {timestamp}")
        
        if self.start_time:
            duration = self.end_time - self.start_time
            total_seconds = int(duration.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            
            if hours > 0:
                duration_str = f"{hours}시간 {minutes}분 {seconds}초"
            elif minutes > 0:
                duration_str = f"{minutes}분 {seconds}초"
            else:
                duration_str = f"{seconds}초"
            
            print(f"⏱️ 총 소요시간: {duration_str}")
            return duration
        return None
        
    async def setup_browser(self):
        """브라우저 설정 및 초기화"""
        try:
            self.playwright = await async_playwright().start()
            
            # Chromium 브라우저 실행 (Lambda 최적화)
            browser_args = [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-ipc-flooding-protection',
                '--disable-background-networking'
            ]
            
            # Lambda 환경에서 추가 최적화
            if os.environ.get('AWS_LAMBDA_FUNCTION_NAME'):
                browser_args.extend([
                    '--single-process',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                    '--memory-pressure-off'
                ])
                
            self.browser = await self.playwright.chromium.launch(
                headless=self.headless,
                args=browser_args
            )
            
            # 컨텍스트 생성 (User-Agent 포함)
            self.context = await self.browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            
            # 새 페이지 생성
            self.page = await self.context.new_page()
            
            # 뷰포트 설정
            await self.page.set_viewport_size({"width": 1920, "height": 1080})
            
            print("✅ Playwright 브라우저가 성공적으로 초기화되었습니다.")
            
        except Exception as e:
            print(f"❌ 브라우저 초기화 중 오류 발생: {str(e)}")
            raise
            
    async def navigate_to_page(self, url):
        """페이지로 이동"""
        try:
            print(f"📄 페이지 이동 중: {url}")
            
            # 페이지 로드
            await self.page.goto(url, wait_until='domcontentloaded', timeout=30000)
            
            # 추가 로딩 대기
            await self.page.wait_for_timeout(3000)
            
            print("✅ 페이지 로딩 완료")
            
        except Exception as e:
            print(f"❌ 페이지 이동 중 오류 발생: {str(e)}")
            raise
            
    async def select_period_type(self, period_type="연간"):
        """
        연간/분기 라디오 버튼 선택
        
        Args:
            period_type (str): "연간" 또는 "분기"
            
        Returns:
            bool: 성공 여부
        """
        try:
            print(f"📅 '{period_type}' 기간 타입 선택 시도 중...")
            
            # 다양한 셀렉터로 라디오 버튼 찾기
            selectors = [
                f"input[type='radio'][value*='{period_type}']",
                f"input[type='radio'] + label:has-text('{period_type}')",
                f"label:has-text('{period_type}') input[type='radio']",
                f"[for*='{period_type}']",
                f"input[id*='{period_type}']",
                f"input[name*='period'][value*='{period_type}']",
                f"input[name*='term'][value*='{period_type}']"
            ]
            
            # 각 셀렉터로 시도
            for selector in selectors:
                try:
                    element = self.page.locator(selector).first
                    if await element.is_visible():
                        await element.scroll_into_view_if_needed()
                        await self.page.wait_for_timeout(500)
                        await element.click()
                        print(f"✅ '{period_type}' 라디오 버튼 클릭 성공!")
                        await self.page.wait_for_timeout(2000)  # 데이터 로딩 대기
                        return True
                except Exception as e:
                    continue
            
            # JavaScript로 직접 라디오 버튼 클릭 시도
            print(f"🔄 JavaScript로 '{period_type}' 라디오 버튼 클릭 시도...")
            
            js_click_script = f"""
            () => {{
                // 라디오 버튼 찾기
                const radioButtons = Array.from(document.querySelectorAll('input[type="radio"]'));
                let targetRadio = null;
                
                // value 속성에서 찾기
                targetRadio = radioButtons.find(radio => 
                    radio.value && radio.value.includes('{period_type}')
                );
                
                // 라벨 텍스트에서 찾기
                if (!targetRadio) {{
                    for (const radio of radioButtons) {{
                        const label = document.querySelector(`label[for="${{radio.id}}"]`);
                        if (label && label.textContent.includes('{period_type}')) {{
                            targetRadio = radio;
                            break;
                        }}
                        
                        // 부모 라벨 확인
                        const parentLabel = radio.closest('label');
                        if (parentLabel && parentLabel.textContent.includes('{period_type}')) {{
                            targetRadio = radio;
                            break;
                        }}
                    }}
                }}
                
                // 텍스트 주변 라디오 버튼 찾기
                if (!targetRadio) {{
                    const spans = Array.from(document.querySelectorAll('span, div, td'));
                    for (const span of spans) {{
                        if (span.textContent && span.textContent.trim() === '{period_type}') {{
                            const nearbyRadio = span.parentElement?.querySelector('input[type="radio"]') ||
                                              span.querySelector('input[type="radio"]') ||
                                              span.previousElementSibling?.querySelector('input[type="radio"]') ||
                                              span.nextElementSibling?.querySelector('input[type="radio"]');
                            if (nearbyRadio) {{
                                targetRadio = nearbyRadio;
                                break;
                            }}
                        }}
                    }}
                }}
                
                if (targetRadio) {{
                    targetRadio.checked = true;
                    targetRadio.click();
                    
                    // change 이벤트 발생
                    const event = new Event('change', {{ bubbles: true }});
                    targetRadio.dispatchEvent(event);
                    
                    return true;
                }}
                return false;
            }}
            """
            
            result = await self.page.evaluate(js_click_script)
            if result:
                print(f"✅ JavaScript로 '{period_type}' 라디오 버튼 클릭 성공!")
                await self.page.wait_for_timeout(3000)  # 데이터 로딩 대기
                return True
                
            print(f"❌ '{period_type}' 라디오 버튼을 찾을 수 없습니다.")
            return False
            
        except Exception as e:
            print(f"❌ '{period_type}' 라디오 버튼 클릭 중 오류 발생: {str(e)}")
            return False

    async def click_tab(self, tab_name):
        """
        투자분석 탭 클릭
        
        Args:
            tab_name (str): 클릭할 탭 이름
            
        Returns:
            bool: 성공 여부
        """
        try:
            print(f"🖱️ '{tab_name}' 탭 클릭 시도 중...")
            
            # 다양한 셀렉터로 탭 찾기
            selectors = [
                f"text={tab_name}",
                f"a:has-text('{tab_name}')",
                f"span:has-text('{tab_name}')",
                f"button:has-text('{tab_name}')",
                f"td:has-text('{tab_name}')",
                f"div:has-text('{tab_name}')",
                f"[onclick*='{tab_name}']",
                f"[href*='{tab_name}']"
            ]
            
            # 각 셀렉터로 시도
            for selector in selectors:
                try:
                    # 요소가 보이는지 확인
                    element = self.page.locator(selector).first
                    if await element.is_visible():
                        # 요소를 화면에 스크롤
                        await element.scroll_into_view_if_needed()
                        await self.page.wait_for_timeout(500)
                        
                        # 클릭
                        await element.click()
                        print(f"✅ '{tab_name}' 탭 클릭 성공!")
                        
                        # 데이터 로딩 대기
                        await self.page.wait_for_timeout(3000)
                        return True
                        
                except Exception as e:
                    continue
                    
            # JavaScript로 직접 클릭 시도
            print(f"🔄 JavaScript로 '{tab_name}' 탭 클릭 시도...")
            
            js_click_script = f"""
            () => {{
                const elements = Array.from(document.querySelectorAll('*'));
                const targetElement = elements.find(el => 
                    el.textContent && el.textContent.trim() === '{tab_name}' &&
                    (el.tagName === 'A' || el.tagName === 'SPAN' || el.tagName === 'BUTTON' || el.tagName === 'TD')
                );
                
                if (targetElement) {{
                    targetElement.click();
                    return true;
                }}
                return false;
            }}
            """
            
            result = await self.page.evaluate(js_click_script)
            if result:
                print(f"✅ JavaScript로 '{tab_name}' 탭 클릭 성공!")
                await self.page.wait_for_timeout(3000)
                return True
                
            print(f"❌ '{tab_name}' 탭을 찾을 수 없습니다.")
            return False
            
        except Exception as e:
            print(f"❌ '{tab_name}' 탭 클릭 중 오류 발생: {str(e)}")
            return False
            
    async def extract_table_data(self, tab_name):
        """
        현재 화면의 테이블 데이터 추출 (특정 키워드가 포함된 테이블만)
        
        Args:
            tab_name (str): 현재 탭 이름
            
        Returns:
            pandas.DataFrame: 추출된 데이터
        """
        try:
            print(f"📊 '{tab_name}' 탭에서 테이블 데이터 추출 중...")
            
            # 테이블 로딩 대기
            await self.page.wait_for_timeout(3000)
            
            # 간단한 테이블 개수 확인
            table_count = await self.page.evaluate("""
            () => {
                const tables = document.querySelectorAll('table.gHead01.all-width.data-list');
                return tables.length;
            }
            """)
            
            print(f"🔍 페이지에서 발견된 target 테이블 수: {table_count}개")
            
            # 탭별 키워드 매핑
            tab_keywords = {
                '수익성': '매출총이익률',
                '성장성': '매출액증가율',
                '안정성': '부채비율',
                '활동성': '총자산회전율'
            }
            
            keyword = tab_keywords.get(tab_name, '')
            if not keyword:
                print(f"❌ '{tab_name}' 탭에 대한 키워드가 정의되지 않았습니다.")
                return pd.DataFrame()
            
            print(f"🔍 '{keyword}' 키워드가 포함된 테이블을 찾는 중...")
            
            # JavaScript로 키워드가 포함된 테이블 찾기
            table_data = await self.page.evaluate(f"""
            () => {{
                const keyword = '{keyword}';
                const results = [];
                
                // 모든 테이블 검사
                const allTables = document.querySelectorAll('table.gHead01.all-width.data-list');
                console.log('Found all target tables:', allTables.length);
                
                for (const table of allTables) {{
                    // 테이블 내용에서 키워드 검색
                    const tableText = table.textContent;
                    if (tableText.includes(keyword)) {{
                        console.log('Found table with keyword:', keyword);
                        
                        const rows = table.querySelectorAll('tr');
                        if (rows.length > 1) {{
                            const tableData = [];
                            
                            for (const row of rows) {{
                                const cells = row.querySelectorAll('td, th');
                                if (cells.length > 0) {{
                                    const rowData = [];
                                    for (const cell of cells) {{
                                        const text = cell.textContent.trim();
                                        rowData.push(text);
                                    }}
                                    if (rowData.some(cell => cell)) {{
                                        tableData.push(rowData);
                                    }}
                                }}
                            }}
                            
                            if (tableData.length > 1) {{
                                results.push(tableData);
                                console.log('Extracted table data rows:', tableData.length);
                                break; // 첫 번째 매칭 테이블만 사용
                            }}
                        }}
                    }}
                }}
                
                if (results.length === 0) {{
                    console.log('No table found with keyword:', keyword);
                    // 대체: 첫 번째 유효한 테이블 사용
                    for (const table of allTables) {{
                        const rows = table.querySelectorAll('tr');
                        if (rows.length > 5) {{ // 최소 5행 이상인 테이블
                            const tableData = [];
                            for (const row of rows) {{
                                const cells = row.querySelectorAll('td, th');
                                if (cells.length > 0) {{
                                    const rowData = [];
                                    for (const cell of cells) {{
                                        const text = cell.textContent.trim();
                                        rowData.push(text);
                                    }}
                                    if (rowData.some(cell => cell)) {{
                                        tableData.push(rowData);
                                    }}
                                }}
                            }}
                            if (tableData.length > 1) {{
                                results.push(tableData);
                                console.log('Using fallback table with rows:', tableData.length);
                                break;
                            }}
                        }}
                    }}
                }}
                
                return results;
            }}
            """)
            
            if table_data:
                # 가장 많은 컬럼을 가진 테이블 선택 (투자분석 데이터는 연도별 컬럼이 많음)
                best_table = max(table_data, key=lambda t: len(t[0]) if t else 0)
                
                if len(best_table) > 1:
                    headers = best_table[0]
                    data_rows = best_table[1:]
                    
                    # 컬럼 수 맞추기
                    max_cols = max(len(headers), max(len(row) for row in data_rows))
                    
                    # 헤더 조정 및 중복 제거
                    while len(headers) < max_cols:
                        headers.append(f'Column_{len(headers)+1}')
                    headers = headers[:max_cols]
                    
                    # 중복된 컬럼명 처리
                    seen = {}
                    for i, header in enumerate(headers):
                        if header in seen:
                            seen[header] += 1
                            headers[i] = f"{header}_{seen[header]}"
                        else:
                            seen[header] = 0
                    
                    # 컬럼명 정리
                    headers = [self._clean_column_name(header) for header in headers]
                    
                    # 데이터 행 조정
                    adjusted_data = []
                    for row in data_rows:
                        adjusted_row = row[:max_cols]
                        while len(adjusted_row) < max_cols:
                            adjusted_row.append('')
                        adjusted_data.append(adjusted_row)
                    
                    df = pd.DataFrame(adjusted_data, columns=headers)
                    
                    # 숫자값에서 콤마 제거
                    df = self._clean_numeric_values(df)
                    
                    # 계층 구조 파싱 (id와 parent_id 컬럼 추가)
                    df = self._add_hierarchy_columns(df)
                    
                    print(f"✅ '{tab_name}' 탭에서 {len(df)}행의 데이터를 추출했습니다.")
                    return df
                    
            print(f"❌ '{tab_name}' 탭에서 테이블 데이터를 찾을 수 없습니다.")
            return pd.DataFrame()
            
        except Exception as e:
            print(f"❌ '{tab_name}' 탭에서 데이터 추출 중 오류 발생: {str(e)}")
            return pd.DataFrame()
    
    def _add_hierarchy_columns(self, df):
        """
        데이터프레임에 계층 구조를 나타내는 id와 parent_id 컬럼을 추가
        
        Args:
            df (pandas.DataFrame): 원본 데이터프레임
            
        Returns:
            pandas.DataFrame: id, parent_id 컬럼이 추가된 데이터프레임
        """
        try:
            if df.empty or len(df.columns) == 0:
                return df
                
            # 첫 번째 컬럼을 항목명으로 가정
            item_column = df.columns[0]
            
            # id와 parent_id 컬럼 초기화
            df['id'] = range(1, len(df) + 1)
            df['parent_id'] = None
            
            # 계층 구조 파싱 - 간단한 방식
            last_parent_id = None  # 가장 최근의 "펼치기" 항목 ID
            
            for idx, row in df.iterrows():
                item_text = str(row[item_column]).strip()
                current_id = row['id']
                
                # "펼치기"가 있는지 확인 (텍스트 정리 전에)
                is_parent = self._is_parent_item(item_text)
                
                if is_parent:
                    # "펼치기"가 있으면 상위 객체 → 부모 ID 업데이트
                    last_parent_id = current_id
                    # 상위 객체는 parent_id가 None (최상위)
                    df.at[idx, 'parent_id'] = None
                else:
                    # "펼치기"가 없으면 하위 객체 → 가장 최근 부모의 자식
                    if last_parent_id is not None:
                        df.at[idx, 'parent_id'] = last_parent_id
                    else:
                        df.at[idx, 'parent_id'] = None
                
                # 마지막에 텍스트 정리 (펼치기 제거)
                clean_text = self._clean_item_text(item_text)
                df.at[idx, item_column] = clean_text
                    
            # 컬럼 순서 재정렬 (id, parent_id를 맨 앞으로)
            cols = ['id', 'parent_id'] + [col for col in df.columns if col not in ['id', 'parent_id']]
            df = df[cols]
            
            # 계층 구조 분석 결과 출력
            parent_count = len([x for x in df['parent_id'] if pd.notna(x)])
            parent_items = len([True for idx, row in df.iterrows() if self._is_parent_item(str(row[item_column]) + ("펼치기" if pd.notna(row.get('parent_id')) else ""))])
            
            print(f"🔗 계층 구조 파싱 완료:")
            print(f"   - 하위 항목: {parent_count}개")
            print(f"   - 상위 항목: {len(df) - parent_count}개")
            
            # 디버깅: 처음 몇 개 항목의 계층 구조 출력
            if len(df) > 0:
                print(f"📋 계층 구조 예시 (처음 5개):")
                for i, (idx, row) in enumerate(df.head(5).iterrows()):
                    item_name = str(row[item_column])[:30] + "..." if len(str(row[item_column])) > 30 else str(row[item_column])
                    parent_info = f"→ 부모ID: {row['parent_id']}" if pd.notna(row['parent_id']) else "→ 최상위"
                    print(f"   {row['id']:2d}. {item_name:35s} {parent_info}")
            
            return df
            
        except Exception as e:
            print(f"❌ 계층 구조 파싱 중 오류: {str(e)}")
            # 오류 발생시 기본 id만 추가하고 반환
            df['id'] = range(1, len(df) + 1)
            df['parent_id'] = None
            return df
    
    def _clean_numeric_values(self, df):
        """
        DataFrame의 숫자값에서 콤마를 제거
        
        Args:
            df (pd.DataFrame): 원본 DataFrame
            
        Returns:
            pd.DataFrame: 콤마가 제거된 DataFrame
        """
        try:
            # 모든 컬럼에 대해 콤마 제거 (id, parent_id, company_code는 제외)
            for col in df.columns:
                if col not in ['id', 'parent_id', 'company_code'] and len(df.columns) > 1:
                    # 문자열로 변환 후 콤마 제거
                    df[col] = df[col].astype(str).str.replace(',', '', regex=False)
            
            print(f"🧹 숫자값 콤마 제거 완료")
            return df
            
        except Exception as e:
            print(f"⚠️ 숫자값 정리 중 오류: {str(e)}")
            return df
    
    def _clean_column_name(self, column_name):
        """
        컬럼명을 정리하는 함수
        
        Args:
            column_name (str): 원본 컬럼명
            
        Returns:
            str: 정리된 컬럼명
        """
        if not column_name:
            return ""
        
        # 1. 연간컨센서스보기 패턴 제거: "\n...보기" -> ""
        if "연간컨센서스보기" in column_name:
            column_name = re.sub(r'\n.*?보기', '', column_name)
        
        # 2. 연간컨센서스닫기 패턴 변환: "\n...닫기" -> "(연간컨센서스)"
        if "연간컨센서스닫기" in column_name:
            column_name = re.sub(r'\n.*?닫기', '(연간컨센서스)', column_name)
        
        # 3. _1 패턴 변환: "_1" -> "(연간컨센서스)"
        if column_name.endswith('_1'):
            column_name = column_name.replace('_1', '(연간컨센서스)')
        
        # 4. 기타 개행문자와 탭 정리
        column_name = re.sub(r'[\n\t\r]+', ' ', column_name)
        
        # 5. 연속된 공백을 하나로 변환
        column_name = re.sub(r'\s+', ' ', column_name)
        
        return column_name.strip()
    
    def _clean_item_text(self, text):
        """
        항목 텍스트에서 불필요한 문자 제거
        
        Args:
            text (str): 원본 텍스트
            
        Returns:
            str: 정리된 텍스트
        """
        if not text:
            return text
            
        # "펼치기" 텍스트와 관련 문자 제거
        clean_text = text.replace('펼치기', '').strip()
        
        # 탭과 과도한 공백 정리
        clean_text = ' '.join(clean_text.split())
        
        # 접기/펼치기 관련 특수문자 제거
        clean_text = clean_text.replace('▼', '').replace('▲', '').replace('△', '').replace('▽', '')
        clean_text = clean_text.replace('+', '').replace('-', '').strip()
        
        return clean_text
    
    def _is_parent_item(self, text):
        """
        해당 항목이 상위 항목(접기/펼치기가 가능한 항목)인지 판단
        
        Args:
            text (str): 분석할 텍스트
            
        Returns:
            bool: 상위 항목 여부
        """
        if not text:
            return False
            
        # "펼치기" 키워드가 있으면 상위 항목
        if '펼치기' in text:
            return True
            
        # 접기/펼치기 관련 특수문자가 있으면 상위 항목
        expand_collapse_chars = ['▼', '▲', '△', '▽', '+', '-']
        if any(char in text for char in expand_collapse_chars):
            return True
            
        # 특정 패턴의 항목명 (예: "수익성 지표", "성장성 분석" 등)
        parent_keywords = ['지표', '분석', '비율', '현황', '상황', '내역']
        clean_text = self._clean_item_text(text)
        if any(keyword in clean_text for keyword in parent_keywords):
            return True
            
        return False
            
    async def crawl_all_tabs(self, url, company_code="004150", period_type="연간"):
        """
        모든 투자분석 탭의 데이터를 크롤링
        
        Args:
            url (str): 크롤링할 페이지 URL
            company_code (str): 회사 코드
            period_type (str): "연간" 또는 "분기"
            
        Returns:
            dict: 각 탭별 데이터프레임을 담은 딕셔너리
        """
        tabs = ['수익성', '성장성', '안정성', '활동성']
        results = {}
        
        try:
            # 브라우저 설정
            await self.setup_browser()
            
            # 페이지 이동
            await self.navigate_to_page(url)
            
            # 기간 타입 선택 (연간/분기)
            print(f"📅 기간 타입 '{period_type}' 선택 중...")
            period_selected = await self.select_period_type(period_type)
            if not period_selected:
                print(f"⚠️ '{period_type}' 기간 타입 선택에 실패했지만 크롤링을 계속 진행합니다.")
            
            # 각 탭 순차적으로 크롤링
            for i, tab in enumerate(tabs):
                print(f"\n{'='*50}")
                print(f"[{i+1}/{len(tabs)}] {tab} 탭 크롤링 시작")
                print(f"{'='*50}")
                
                # 탭 클릭
                if await self.click_tab(tab):
                    # 데이터 추출
                    df = await self.extract_table_data(tab)
                    if not df.empty:
                        results[tab] = df
                        print(f"✅ '{tab}' 탭 크롤링 성공: {len(df)}행")
                    else:
                        print(f"❌ '{tab}' 탭에서 데이터를 추출하지 못했습니다.")
                else:
                    print(f"❌ '{tab}' 탭을 클릭하지 못했습니다.")
                
                # 탭 간 전환을 위한 대기
                await self.page.wait_for_timeout(2000)
                
            return results
            
        except Exception as e:
            print(f"❌ 크롤링 중 오류 발생: {str(e)}")
            return results
            
        finally:
            await self.cleanup()
            
    async def cleanup(self):
        """브라우저 종료 및 정리"""
        try:
            if self.page:
                await self.page.close()
            if hasattr(self, 'context') and self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if hasattr(self, 'playwright'):
                await self.playwright.stop()
            print("🧹 브라우저를 종료했습니다.")
        except Exception as e:
            print(f"⚠️ 브라우저 종료 중 오류: {str(e)}")
    
    async def close_browser(self):
        """브라우저 정리 (별칭 메서드)"""
        await self.cleanup()
            
    async def _crawl_single_company(self, url, company_code, company_name, period_type="연간"):
        """
        단일 회사 크롤링 (브라우저 재사용)
        
        Args:
            url (str): 크롤링할 URL
            company_code (str): 회사 코드
            company_name (str): 회사명
            period_type (str): "연간" 또는 "분기"
            
        Returns:
            dict: 크롤링 결과
        """
        try:
            # 페이지 이동
            await self.navigate_to_page(url)
            
            # 기간 타입 선택 (연간/분기)
            print(f"📅 {company_name}: 기간 타입 '{period_type}' 선택 중...")
            period_selected = await self.select_period_type(period_type)
            if not period_selected:
                print(f"⚠️ {company_name}: '{period_type}' 기간 타입 선택에 실패했지만 크롤링을 계속 진행합니다.")
            
            tabs = ['수익성', '성장성', '안정성', '활동성']
            results = {}
            
            for i, tab in enumerate(tabs):
                print(f"[{i+1}/4] {tab} 탭 크롤링 중...")
                
                if await self.click_tab(tab):
                    df = await self.extract_table_data(tab)
                    if not df.empty:
                        results[tab] = df
                        print(f"✅ {tab}: {len(df)}행")
                    else:
                        print(f"❌ {tab}: 데이터 없음")
                else:
                    print(f"❌ {tab}: 탭 클릭 실패")
                
                # 탭 간 대기
                await self.page.wait_for_timeout(2000)
                
            return results
            
        except Exception as e:
            print(f"❌ {company_name} 크롤링 중 오류: {str(e)}")
            return {}
    
    def save_to_json_single(self, results, filename, company_code, company_name):
        """단일 회사 결과를 JSON 파일로 저장"""
        if not results:
            print(f"❌ {company_name}: 저장할 데이터가 없습니다.")
            return
            
        try:
            json_data = {
                'timestamp': datetime.now().isoformat(),
                'company_code': company_code,
                'company_name': company_name,
                'data': {}
            }
            
            for tab_name, df in results.items():
                # DataFrame을 JSON 직렬화 가능한 형태로 변환
                df_clean = df.copy()
                # NaN 값을 None으로 변환
                df_clean = df_clean.where(pd.notnull(df_clean), None)
                # 모든 값을 문자열로 변환 후 records로 변환
                json_data['data'][tab_name] = df_clean.astype(str).replace('nan', None).to_dict('records')
                
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, ensure_ascii=False, indent=2)
                
            print(f"💾 {company_name} JSON 저장: {filename}")
            
        except Exception as e:
            print(f"❌ {company_name} JSON 저장 실패: {str(e)}")
    
    def save_to_csv_single(self, results, filename, company_code, company_name, period_type="연간"):
        """단일 회사 결과를 CSV 파일로 저장"""
        if not results:
            print("❌ 저장할 데이터가 없습니다.")
            return
            
        try:
            all_data = []
            
            for tab_name, df in results.items():
                # 회사 정보와 탭 이름을 구분하기 위한 컬럼 추가
                df_copy = df.copy()
                df_copy.insert(0, 'company_code', str(company_code).zfill(6))  # 6자리 문자열로 변환
                df_copy.insert(1, 'company_name', company_name)
                df_copy.insert(2, 'tab', tab_name)
                df_copy.insert(3, 'search_type', period_type)  # 연간/분기 구분 추가
                all_data.append(df_copy)
            
            # 모든 탭의 데이터를 하나로 합치기
            combined_df = pd.concat(all_data, ignore_index=True)
            
            # CSV 파일로 저장 (UTF-8 BOM으로 한글 깨짐 방지)
            combined_df.to_csv(filename, index=False, encoding='utf-8-sig')
            print(f"💾 {company_name} CSV 저장: {filename}")
            
        except Exception as e:
            print(f"❌ CSV 파일 저장 중 오류 발생: {str(e)}")
            
    def save_to_excel(self, results, filename=None):
        """결과를 엑셀 파일로 저장"""
        if not results:
            print("❌ 저장할 데이터가 없습니다.")
            return
        
        # 기본 파일명에 날짜 접두사 추가
        if filename is None:
            date_prefix = datetime.now().strftime("%Y%m%d")
            filename = f"{date_prefix}_hansol_investment_analysis_playwright.xlsx"
            
        try:
            with pd.ExcelWriter(filename, engine='openpyxl') as writer:
                for tab_name, df in results.items():
                    sheet_name = tab_name.replace('/', '_').replace('\\', '_')
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                    
            print(f"💾 데이터가 '{filename}' 파일로 저장되었습니다.")
            
        except Exception as e:
            print(f"❌ 파일 저장 중 오류 발생: {str(e)}")
    
    def save_to_csv(self, results, filename=None, period_type="연간"):
        """결과를 CSV 파일로 저장 (모든 탭을 하나의 파일에)"""
        if not results:
            print("❌ 저장할 데이터가 없습니다.")
            return
        
        # 기본 파일명에 날짜 접두사 추가
        if filename is None:
            date_prefix = datetime.now().strftime("%Y%m%d")
            filename = f"{date_prefix}_hansol_investment_analysis_playwright.csv"
            
        try:
            all_data = []
            
            for tab_name, df in results.items():
                # 탭 이름과 조회구분을 구분하기 위한 컬럼 추가
                df_copy = df.copy()
                df_copy.insert(0, 'tab', tab_name)
                df_copy.insert(1, '조회구분', period_type)  # 연간/분기 구분 추가
                all_data.append(df_copy)
            
            # 모든 탭의 데이터를 하나로 합치기
            combined_df = pd.concat(all_data, ignore_index=True)
            
            # CSV 파일로 저장
            combined_df.to_csv(filename, index=False, encoding='utf-8-sig')
            print(f"💾 데이터가 '{filename}' 파일로 저장되었습니다.")
            
        except Exception as e:
            print(f"❌ CSV 파일 저장 중 오류 발생: {str(e)}")
    
    def _extract_data_type_from_column(self, column_name):
        """
        컬럼명에서 데이터 타입을 추출하는 함수
        
        Args:
            column_name (str): 컬럼명 (예: "2020/12(IFRS연결)")
            
        Returns:
            str: 데이터 타입 (예: "IFRS연결")
        """
        try:
            if not column_name or '(' not in column_name:
                return 'IFRS연결'  # 기본값
            
            # 여러 괄호가 있는 경우를 처리
            # 예: "2025/12(E)(IFRS연결) (연간컨센서스)"
            
            # IFRS 관련 패턴을 우선적으로 찾기
            import re
            
            # IFRS 패턴 매칭 (IFRS연결, IFRS별도, K-GAAP연결 등)
            ifrs_pattern = r'\(([^()]*(?:IFRS|GAAP)[^()]*)\)'
            matches = re.findall(ifrs_pattern, column_name)
            
            if matches:
                # 첫 번째 IFRS 관련 매치 사용
                data_type = matches[0]
                
                # 연간컨센서스 제거
                if '연간컨센서스' in data_type:
                    data_type = data_type.replace('연간컨센서스', '').strip()
                
                return data_type if data_type else 'IFRS연결'
            
            # IFRS 패턴이 없으면 첫 번째 괄호 내용 사용 (E, 연간컨센서스 등은 제외)
            first_paren_content = re.search(r'\((.*?)\)', column_name)
            if first_paren_content:
                content = first_paren_content.group(1)
                
                # E, 연간컨센서스 등은 데이터 타입이 아니므로 무시
                if content in ['E', '연간컨센서스'] or '연간컨센서스' in content:
                    return 'IFRS연결'  # 기본값
                
                return content
            
            return 'IFRS연결'  # 기본값
                
        except Exception as e:
            print(f"⚠️ 데이터 타입 추출 중 오류: {str(e)}")
            return 'IFRS연결'  # 기본값
    
    def transform_to_row_format(self, combined_df):
        """
        컬럼 기반 데이터를 row 기반으로 변환하는 메소드
        
        Args:
            combined_df (pd.DataFrame): 크롤링된 원본 데이터
            
        Returns:
            pd.DataFrame: 변환된 데이터
        """
        try:
            print(f"📊 데이터 변환 시작: {combined_df.shape}")
            
            # 변환할 컬럼들 식별
            # 1. 연도 컬럼들 (IFRS연결이 포함되고 '/'가 있는 컬럼)
            year_columns = [col for col in combined_df.columns if 'IFRS연결' in col and '/' in col]
            
            # 2. 분석 컬럼들 (전년대비 등)
            analysis_columns = [col for col in combined_df.columns if any(keyword in col for keyword in ['YoY', '전년대비', '증감률', 'CAGR'])]
            
            # 3. 전체 변환 대상 컬럼
            target_columns = year_columns + analysis_columns
            
            print(f"🔍 변환할 연도 컬럼들: {year_columns}")
            print(f"📈 변환할 분석 컬럼들: {analysis_columns}")
            print(f"📊 전체 변환 대상: {len(target_columns)}개 컬럼")
            
            if not target_columns:
                print("❌ 변환할 컬럼을 찾을 수 없습니다.")
                return pd.DataFrame()
            
            # 데이터 변환을 위한 리스트
            transformed_data = []
            
            print("🔄 데이터 변환 중...")
            
            # 가장 큰 연도/월 찾기 (분석 데이터 매핑용)
            max_year = ''
            max_month = ''
            for year_col in year_columns:
                year_period = year_col.split('(')[0]  # "2020/12"
                year_parts = year_period.split('/')
                if len(year_parts) >= 2:
                    yy = year_parts[0]
                    mm = year_parts[1]
                    if yy.isdigit() and (not max_year or yy > max_year):
                        max_year = yy
                        max_month = mm
            
            print(f"📅 분석 데이터 매핑 기준: {max_year}/{max_month}")
            
            for _, row in combined_df.iterrows():
                for target_col in target_columns:
                    # 컬럼 타입에 따른 처리
                    if target_col in year_columns:
                        # 연도 컬럼 처리
                        year_period = target_col.split('(')[0]  # "2020/12"
                        year_parts = year_period.split('/')
                        yy = year_parts[0] if len(year_parts) > 0 else ''
                        mm = year_parts[1] if len(year_parts) > 1 else ''
                        data_type = self._extract_data_type_from_column(target_col)
                        column_type = 'year_data'
                        # value_type 결정 (E가 있으면 Expected, 없으면 Real)
                        value_type = 'Expected' if '(E)' in target_col else 'Real'
                    else:
                        # 분석 컬럼 처리 (전년대비 등) - 가장 큰 연도/월에 매핑
                        yy = max_year
                        mm = max_month
                        data_type = self._extract_data_type_from_column(target_col) if '(' in target_col else 'analysis'
                        column_type = 'analysis_data'
                        # 분석 데이터는 모두 Real (실제 계산된 값)
                        value_type = 'Real'
                    
                    # 값이 비어있지 않은 경우만 추가
                    value = row[target_col]
                    if pd.notna(value) and str(value).strip() != '':
                        # 조회구분 정보 가져오기 (없으면 기본값)
                        inquiry_type = row.get('search_type', '연간')
                        
                        # 기본 행 데이터
                        transformed_row = {
                            'tab': row['tab'],
                            'search_type': inquiry_type,
                            'id': row['id'],
                            'parent_id': row['parent_id'],
                            'item': row['항목'],
                            'column_name': target_col,  # 원본 컬럼명 추가
                            'column_type': column_type,  # 컬럼 유형 추가
                            'yyyy': yy,
                            'mm': mm,
                            'value': value,
                            'value_type': value_type,  # Expected/Real 구분
                            'data_type': data_type
                        }
                        
                        # company_code가 있으면 추가 (6자리 문자열로 보장)
                        if 'company_code' in combined_df.columns:
                            company_code = str(row['company_code']).zfill(6)
                            transformed_row['company_code'] = company_code
                        else:
                            # 단일 회사 크롤링인 경우 기본값 설정
                            transformed_row['company_code'] = '004150'
                        
                        # company_name이 있으면 추가
                        if 'company_name' in combined_df.columns:
                            transformed_row['company_name'] = row['company_name']
                        else:
                            # 단일 회사 크롤링인 경우 기본값 설정
                            transformed_row['company_name'] = '한솔홀딩스'
                        
                        transformed_data.append(transformed_row)
            
            if not transformed_data:
                print("❌ 변환할 데이터가 없습니다.")
                return pd.DataFrame()
            
            # 새로운 DataFrame 생성
            transformed_df = pd.DataFrame(transformed_data)
            
            # 컬럼 순서 정리
            desired_columns = ['company_code', 'company_name', 'tab', 'search_type', 'id', 'parent_id', 'item', 'column_name', 'column_type', 'yyyy', 'mm', 'value', 'value_type', 'data_type']
            available_columns = [col for col in desired_columns if col in transformed_df.columns]
            transformed_df = transformed_df[available_columns]
            
            print(f"✅ 변환 완료: {transformed_df.shape}")
            print(f"📈 총 회사 수: {transformed_df['company_code'].nunique()}")
            print(f"📊 총 재무 항목 수: {transformed_df['item'].nunique()}")
            print(f"📅 포함된 연도: {sorted([y for y in transformed_df['yyyy'].unique() if y])}")
            print(f"🔍 조회구분: {sorted(transformed_df['search_type'].unique())}")
            print(f"📋 컬럼 유형: {sorted(transformed_df['column_type'].unique())}")
            print(f"💎 값 유형: {sorted(transformed_df['value_type'].unique())}")
            print(f"🏷️ 데이터 타입: {sorted(transformed_df['data_type'].unique())}")
            print(f"📍 총 데이터 포인트: {len(transformed_df)}")
            
            return transformed_df
            
        except Exception as e:
            print(f"❌ 데이터 변환 중 오류 발생: {str(e)}")
            return pd.DataFrame()
            
    def save_to_json(self, results, filename=None):
        """결과를 JSON 파일로 저장"""
        if not results:
            print("❌ 저장할 데이터가 없습니다.")
            return
        
        # 기본 파일명에 날짜 접두사 추가
        if filename is None:
            date_prefix = datetime.now().strftime("%Y%m%d")
            filename = f"{date_prefix}_hansol_investment_analysis_playwright.json"
            
        try:
            json_data = {
                'timestamp': datetime.now().isoformat(),
                'company_code': '004150',
                'company_name': '한솔홀딩스',
                'data': {}
            }
            
            for tab_name, df in results.items():
                # DataFrame을 JSON 직렬화 가능한 형태로 변환
                df_clean = df.copy()
                # NaN 값을 None으로 변환
                df_clean = df_clean.where(pd.notnull(df_clean), None)
                # 모든 값을 문자열로 변환 후 records로 변환
                json_data['data'][tab_name] = df_clean.astype(str).replace('nan', None).to_dict('records')
                
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, ensure_ascii=False, indent=2)
                
            print(f"💾 데이터가 '{filename}' 파일로 저장되었습니다.")
            
        except Exception as e:
            print(f"❌ JSON 파일 저장 중 오류 발생: {str(e)}")
            
    def print_results_summary(self, results):
        """크롤링 결과 요약 출력"""
        if not results:
            print("❌ 크롤링된 데이터가 없습니다.")
            return
            
        print(f"\n{'='*60}")
        print(f"📊 크롤링 결과 요약")
        print(f"{'='*60}")
        print(f"🏢 회사: 한솔홀딩스 (004150)")
        print(f"⏰ 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📈 수집된 탭: {len(results)}개")
        
        for tab_name, df in results.items():
            print(f"\n📋 [{tab_name}]")
            print(f"   - 행 수: {len(df)}")
            print(f"   - 열 수: {len(df.columns)}")
            
            if len(df.columns) > 0:
                print(f"   - 컬럼: {', '.join(df.columns.tolist()[:3])}{'...' if len(df.columns) > 3 else ''}")
            
            if len(df) > 0:
                # 첫 번째 행의 일부 데이터 표시
                sample_data = df.iloc[0].head(3).to_dict()
                print(f"   - 샘플: {sample_data}")


async def crawl_multiple_stocks(stocks_data, output_dir="./crawl_results", period_type="연간"):
    """
    여러 주식 데이터를 순차적으로 크롤링
    
    Args:
        stocks_data (list): 주식 정보 리스트 
            [{"code": "004150", "name": "한솔홀딩스"}, {"code": "005930", "name": "삼성전자"}, ...]
        output_dir (str): 결과 파일 저장 디렉토리
        period_type (str): "연간" 또는 "분기"
    
    Returns:
        dict: 회사별 크롤링 결과
    """
    print(f"🚀 {len(stocks_data)}개 회사의 투자분석 데이터 크롤링을 시작합니다...")
    
    # 결과 저장 디렉토리 생성
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    all_results = {}
    success_count = 0
    failed_companies = []
    
    # 크롤러 초기화 (한 번만 초기화하여 효율성 증대)
    crawler = PlaywrightStockCrawler(headless=True, wait_timeout=15000)
    crawler.start_timer()  # 타이머 시작
    
    try:
        # 브라우저 설정 (한 번만)
        await crawler.setup_browser()
        
        for i, stock_info in enumerate(stocks_data):
            company_code = stock_info.get('code', '')
            company_name = stock_info.get('name', f'Company_{company_code}')
            
            print(f"\n{'='*60}")
            print(f"[{i+1}/{len(stocks_data)}] {company_name} ({company_code}) 크롤링 시작")
            print(f"{'='*60}")
            
            try:
                # URL 생성
                url = f"https://navercomp.wisereport.co.kr/v2/company/c1040001.aspx?cn=&cmp_cd={company_code}&menuType=block"
                
                # 해당 회사 크롤링 (브라우저 재사용)
                results = await crawler._crawl_single_company(url, company_code, company_name, period_type)
                
                if results:
                    all_results[company_code] = {
                        'company_name': company_name,
                        'company_code': company_code,
                        'data': results,
                        'status': 'success'
                    }
                    
                    # 개별 파일 저장은 하지 않음 (최종 통합 파일만 저장)
                    
                    success_count += 1
                    print(f"✅ {company_name} 크롤링 성공!")
                    
                else:
                    failed_companies.append(f"{company_name}({company_code})")
                    print(f"❌ {company_name} 크롤링 실패 - 데이터 없음")
                    
            except Exception as e:
                failed_companies.append(f"{company_name}({company_code})")
                print(f"❌ {company_name} 크롤링 중 오류: {str(e)}")
                
            # 회사 간 대기 (서버 부하 방지)
            if i < len(stocks_data) - 1:  # 마지막이 아니면
                print("⏳ 다음 회사 크롤링을 위해 3초 대기...")
                await asyncio.sleep(3)
                
    finally:
        await crawler.cleanup()
    
    # 전체 결과 요약 저장 (DataFrame을 JSON 직렬화 가능한 형태로 변환)
    json_compatible_results = {}
    for company_code, company_data in all_results.items():
        json_compatible_results[company_code] = {
            'company_name': company_data['company_name'],
            'company_code': company_data['company_code'],
            'data': {}
        }
        
        # DataFrame을 dict로 변환
        for tab_name, df in company_data['data'].items():
            if isinstance(df, pd.DataFrame):
                # DataFrame을 JSON 직렬화 가능한 형태로 변환
                df_clean = df.copy()
                df_clean = df_clean.where(pd.notnull(df_clean), None)
                json_compatible_results[company_code]['data'][tab_name] = df_clean.astype(str).replace('nan', None).to_dict('records')
            else:
                json_compatible_results[company_code]['data'][tab_name] = df
    
    summary_data = {
        'timestamp': datetime.now().isoformat(),
        'total_companies': len(stocks_data),
        'success_count': success_count,
        'failed_count': len(failed_companies),
        'failed_companies': failed_companies,
        'results': json_compatible_results
    }
    
    # 전체 결과 요약 JSON 저장 (날짜 접두사 추가)
    date_prefix = datetime.now().strftime("%Y%m%d")
    summary_filename = f"{output_dir}/{date_prefix}_crawling_summary.json"
    with open(summary_filename, 'w', encoding='utf-8') as f:
        json.dump(summary_data, f, ensure_ascii=False, indent=2)
    
    # 모든 회사 데이터를 하나의 CSV 파일로 합치기
    combined_csv_data = []
    for company_code, company_data in all_results.items():
        if company_data.get('status') == 'success' and 'data' in company_data:
            for tab_name, df in company_data['data'].items():
                if isinstance(df, pd.DataFrame) and not df.empty:
                    # 회사 정보와 탭 정보 추가
                    df_copy = df.copy()
                    df_copy.insert(0, 'company_code', str(company_code).zfill(6))  # 6자리 문자열로 변환
                    df_copy.insert(1, 'company_name', company_data['company_name'])
                    df_copy.insert(2, 'tab', tab_name)
                    df_copy.insert(3, 'search_type', period_type)  # 연간/분기 구분 추가
                    combined_csv_data.append(df_copy)
    
    # 전체 데이터를 하나의 CSV로 저장 후 변환
    if combined_csv_data:
        combined_df = pd.concat(combined_csv_data, ignore_index=True)
        
        # 데이터 변환 (컬럼 → 행)
        print(f"\n🔄 전체 데이터 변환 중... (기간: {period_type})")
        
        # 임시 크롤러 객체 생성 (변환 메소드 사용을 위해)
        temp_crawler = PlaywrightStockCrawler()
        transformed_df = temp_crawler.transform_to_row_format(combined_df)
        
        if not transformed_df.empty:
            # 최종 변환된 파일만 저장
            period_suffix = "_annual" if period_type == "연간" else "_quarterly"
            final_filename = f"{output_dir}/{date_prefix}_all_companies{period_suffix}_transformed.csv"
            transformed_df.to_csv(final_filename, index=False, encoding='utf-8-sig')
            print(f"💾 최종 변환된 통합 데이터가 저장되었습니다: {final_filename}")
        else:
            print("❌ 데이터 변환에 실패했습니다.")
    else:
        print("⚠️ 통합할 데이터가 없어 파일을 생성하지 않았습니다.")
    
    # 결과 출력
    print(f"\n{'='*60}")
    print(f"📊 전체 크롤링 결과 요약")
    print(f"{'='*60}")
    print(f"🏢 총 회사 수: {len(stocks_data)}")
    print(f"✅ 성공: {success_count}개")
    print(f"❌ 실패: {len(failed_companies)}개")
    
    if failed_companies:
        print(f"❌ 실패한 회사들: {', '.join(failed_companies)}")
    
    print(f"💾 결과 파일이 '{output_dir}' 폴더에 저장되었습니다.")
    print(f"📁 최종 변환된 파일: all_companies{period_suffix}_transformed.csv")
    print(f"📁 요약 파일: crawling_summary.json")
    
    # 타이머 종료
    crawler.end_timer()
    
    return all_results


async def main(period_type="연간"):
    """메인 실행 함수"""
    print(f"🚀 Playwright를 사용한 투자분석 데이터 크롤링을 시작합니다... (기간: {period_type})")
    
    # 단일 회사 크롤링 (기본값: 한솔홀딩스)
    url = "https://navercomp.wisereport.co.kr/v2/company/c1040001.aspx?cn=&cmp_cd=004150&menuType=block"
    crawler = PlaywrightStockCrawler(headless=True, wait_timeout=15000)
    crawler.start_timer()  # 타이머 시작
    
    try:
        results = await crawler.crawl_all_tabs(url, period_type=period_type)
        
        if results:
            crawler.print_results_summary(results)
            
            # 단일 회사 데이터를 DataFrame으로 변환
            all_data = []
            for tab_name, df in results.items():
                df_copy = df.copy()
                df_copy.insert(0, 'company_code', '004150')  # 한솔홀딩스 코드
                df_copy.insert(1, 'company_name', '한솔홀딩스')
                df_copy.insert(2, 'tab', tab_name)
                df_copy.insert(3, 'search_type', period_type)
                all_data.append(df_copy)
            
            # 모든 탭 데이터 결합
            combined_df = pd.concat(all_data, ignore_index=True)
            
            # 데이터 변환 (컬럼 → 행)
            print(f"\n🔄 데이터 변환 중... (기간: {period_type})")
            transformed_df = crawler.transform_to_row_format(combined_df)
            
            if not transformed_df.empty:
                # 최종 변환된 파일만 저장
                date_prefix = datetime.now().strftime("%Y%m%d_%H%M%S")
                period_suffix = "_annual" if period_type == "연간" else "_quarterly"
                final_filename = f"crawl_results/{date_prefix}_financial_data{period_suffix}_transformed.csv"
                
                # 결과 저장 디렉토리 생성
                os.makedirs("crawl_results", exist_ok=True)
                
                transformed_df.to_csv(final_filename, index=False, encoding='utf-8-sig')
                print(f"💾 최종 변환된 데이터가 저장되었습니다: {final_filename}")
                print(f"🎉 크롤링 및 변환이 완료되었습니다! 총 {len(transformed_df)}개의 데이터 포인트를 수집했습니다.")
            else:
                print("❌ 데이터 변환에 실패했습니다.")
        else:
            print("❌ 크롤링된 데이터가 없습니다.")
            
    except Exception as e:
        print(f"❌ 메인 실행 중 오류 발생: {str(e)}")
    finally:
        # 브라우저 정리 및 타이머 종료
        await crawler.close_browser()
        crawler.end_timer()  # 타이머 종료


def run_crawler(period_type="연간"):
    """동기 함수에서 비동기 크롤러 실행"""
    try:
        if os.name == 'nt':  # Windows
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        asyncio.run(main(period_type))
        
    except Exception as e:
        print(f"❌ 크롤러 실행 중 오류 발생: {str(e)}")


def run_multiple_crawler(stocks_json_file, output_dir="./crawl_results", period_type="연간"):
    """
    JSON 파일에서 주식 목록을 읽어 여러 회사 크롤링
    
    Args:
        stocks_json_file (str): 주식 목록 JSON 파일 경로
        output_dir (str): 결과 저장 디렉토리
        period_type (str): "연간" 또는 "분기"
    """
    try:
        # JSON 파일 읽기
        with open(stocks_json_file, 'r', encoding='utf-8') as f:
            stocks_data = json.load(f)
        
        print(f"📄 {stocks_json_file}에서 {len(stocks_data)}개 회사 정보를 로드했습니다.")
        print(f"📅 기간 타입: {period_type}")
        
        # Windows 이벤트 루프 설정
        if os.name == 'nt':
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        # 다중 크롤링 실행
        asyncio.run(crawl_multiple_stocks(stocks_data, output_dir, period_type))
        
    except FileNotFoundError:
        print(f"❌ 파일을 찾을 수 없습니다: {stocks_json_file}")
        print("💡 예시 JSON 파일 형식:")
        print("""[
  {"code": "004150", "name": "한솔홀딩스"},
  {"code": "005930", "name": "삼성전자"},
  {"code": "000660", "name": "SK하이닉스"}
]""")
    except json.JSONDecodeError:
        print(f"❌ JSON 파일 형식이 올바르지 않습니다: {stocks_json_file}")
    except Exception as e:
        print(f"❌ 다중 크롤러 실행 중 오류 발생: {str(e)}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # 명령줄 인수가 있으면 다중 크롤링
        stocks_file = sys.argv[1]
        output_dir = sys.argv[2] if len(sys.argv) > 2 else "./crawl_results"
        period_type = sys.argv[3] if len(sys.argv) > 3 else "연간"
        run_multiple_crawler(stocks_file, output_dir, period_type)
    else:
        # 기본 단일 크롤링
        period_type = input("기간 타입을 선택하세요 (연간/분기) [기본값: 연간]: ").strip() or "연간"
        if period_type not in ["연간", "분기"]:
            print("⚠️ 잘못된 기간 타입입니다. 기본값 '연간'을 사용합니다.")
            period_type = "연간"
        run_crawler(period_type)
