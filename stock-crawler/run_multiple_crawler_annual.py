"""
여러 주식 종목을 일괄 크롤링하는 실행 스크립트
"""

from playwright_stock_crawler import run_multiple_crawler

if __name__ == "__main__":
    # JSON 파일에서 주식 목록을 읽어와서 크롤링
    stocks_file = "stocks.json"  # 주식 목록 JSON 파일
    output_dir = "./crawl_results"       # 결과 저장 폴더
    
    # # 기간 타입 선택
    # print("📅 기간 타입을 선택하세요:")
    # print("1. 연간 (기본값)")
    # print("2. 분기")
    # choice = input("선택 (1 또는 2) [기본값: 1]: ").strip()
    
    # if choice == "2":
    #     period_type = "분기"
    # else:
    #     period_type = "연간"
    
    print("🔄 여러 주식 종목 일괄 크롤링을 시작합니다...")
    print(f"📄 입력 파일: {stocks_file}")
    print(f"📁 출력 폴더: {output_dir}")
    print(f"📅 기간 타입: 연간")
    print("-" * 50)
    
    run_multiple_crawler(stocks_file, output_dir, "연간")
