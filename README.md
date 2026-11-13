# StudyMate AI

Trợ lý học tập cá nhân hóa bằng tiếng Việt: tóm tắt bài giảng, giải thích kiến thức, tạo câu hỏi trắc nghiệm tương tác và lập kế hoạch ôn tập.

## Chạy ứng dụng

Cần Python 3.9 trở lên. Không cần cài thêm thư viện.

```bash
python3 server.py
```

Mở [http://localhost:8000](http://localhost:8000). Khi chưa cấu hình AI, ứng dụng chạy ở chế độ demo cục bộ để bạn thử giao diện và các công cụ học tập.

## Kết nối AI

Máy chủ hỗ trợ API tương thích với định dạng OpenAI Chat Completions. Cấu hình khóa ở biến môi trường phía máy chủ — không đặt khóa trong mã frontend:

```bash
export OPENAI_API_KEY="your-api-key"
export OPENAI_MODEL="gpt-4o-mini" # tùy chọn
export OPENAI_BASE_URL="https://api.openai.com/v1" # tùy chọn
python3 server.py
```

Để dùng nhà cung cấp tương thích OpenAI, đặt `OPENAI_BASE_URL` thành địa chỉ API gốc của nhà cung cấp và chọn model được hỗ trợ qua `OPENAI_MODEL`.

## Tính năng

- Tóm tắt nội dung thành các ý chính và từ khóa cần nhớ.
- Giải thích kiến thức theo mức cơ bản, trung bình hoặc nâng cao.
- Tạo câu hỏi trắc nghiệm bốn lựa chọn, có phản hồi và giải thích đáp án.
- Lập kế hoạch ôn tập 3, 7 hoặc 14 ngày theo thời lượng mỗi ngày.
- Lưu bộ đếm phiên học trên trình duyệt; sao chép kết quả để ôn tập.

Nếu chưa cài máy chủ hoặc AI chưa được cấu hình, chế độ demo tạo gợi ý cục bộ dựa trên nội dung nhập. Gợi ý này không thay thế kết quả từ mô hình AI.
