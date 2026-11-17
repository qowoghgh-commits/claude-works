# 클로드 작품 서랍

Claude와 함께 만든 작품을 모아 보는 갤러리 웹사이트예요. 빌드 과정이 없는 정적 사이트라 파일만 올리면 돼요.

- `index.html` 갤러리 페이지 (작품 목록이 이 파일 안에 들어 있어요)
- `thumbs/` 작품 썸네일 사진

## 1. GitHub에 올리기 (웹에서)

1. <https://github.com/new> 에서 새 저장소 만들기 (이름 예: `claude-works`, Public)
2. 저장소 화면의 **uploading an existing file** 을 누르고 이 폴더 안의 `index.html`, `thumbs` 폴더, `README.md` 를 **통째로 끌어다 놓기**
3. **Commit changes**

## 2. Vercel로 웹사이트 열기

1. <https://vercel.com/new> → GitHub 저장소 `claude-works` **Import**
2. 설정은 그대로 두고 **Deploy**
3. 나온 주소(예: `https://claude-works.vercel.app`)가 사이트 주소예요.
   주소 앞부분을 바꾸고 싶으면 Vercel 프로젝트 **Settings → Domains** 에서 바꿀 수 있어요.

## 작품을 추가하거나 고칠 때

`index.html` 안의 `const WORKS=[...]` 목록을 고친 뒤, GitHub에서 그 파일만 다시 올리면 Vercel이 자동으로 새로 배포해요.
Claude에게 "작품 서랍에 ○○ 추가해줘"라고 부탁하면 이 파일을 고쳐 줘요.

## 주의

카드를 누르면 claude.ai의 원래 작품으로 이동해요. 다른 사람이 작품을 열려면 claude.ai에서 그 작품의 **공유** 설정을 바꿔야 해요.
