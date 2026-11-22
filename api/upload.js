// 작품 서랍 올리기 API
// 비밀번호를 확인한 뒤 GitHub 저장소에 한 번의 커밋으로 파일을 올려요.
// 커밋이 생기면 Vercel이 사이트를 자동으로 다시 배포해요(보통 1분 안).
//
// Vercel 환경 변수
//   UPLOAD_PASSWORD  작품을 올릴 때 쓰는 비밀번호
//   GITHUB_TOKEN     claude-works 저장소의 Contents 읽기/쓰기 권한이 있는 토큰
//   GITHUB_REPO      (선택) 기본값 qowoghgh-commits/claude-works
//   GITHUB_BRANCH    (선택) 기본값 main

const CATS = ['game', 'lesson', 'slides', 'design', 'class', 'plan', 'tool', 'video', 'draft'];

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 받아요.' });

  const pw = process.env.UPLOAD_PASSWORD;
  const token = process.env.GITHUB_TOKEN;
  if (!pw || !token) return res.status(500).json({ error: '사이트 설정이 아직 끝나지 않았어요. Vercel 환경 변수 UPLOAD_PASSWORD와 GITHUB_TOKEN을 넣어 주세요.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = null; } }
  if (!body) return res.status(400).json({ error: '보낸 내용을 읽지 못했어요.' });
  if (body.password !== pw) return res.status(401).json({ error: '비밀번호가 맞지 않아요.' });
  if (body.action === 'check') return res.status(200).json({ ok: true });

  const repo = process.env.GITHUB_REPO || 'qowoghgh-commits/claude-works';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const gh = async (path, opts = {}) => {
    const r = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'works-drawer' },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`GitHub ${r.status}: ${data.message || '알 수 없는 오류'}`);
    return data;
  };

  try {
    // 현재 작품 목록
    const ref = await gh(`/git/ref/heads/${branch}`);
    const headSha = ref.object.sha;
    const head = await gh(`/git/commits/${headSha}`);
    const listFile = await gh(`/contents/works.json?ref=${headSha}`);
    let works = JSON.parse(Buffer.from(listFile.content, 'base64').toString('utf8'));

    const tree = [];
    const blob = async (path, contentB64) => {
      const b = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: contentB64, encoding: 'base64' }) });
      tree.push({ path, mode: '100644', type: 'blob', sha: b.sha });
    };
    let message;

    if (body.action === 'add') {
      const it = body.item || {};
      const title = String(it.title || '').trim().slice(0, 80);
      if (!title) return res.status(400).json({ error: '제목을 적어 주세요.' });
      const cat = CATS.includes(it.cat) ? it.cat : 'tool';
      const id = 'u-' + Date.now().toString(36);
      const entry = { id, title, cat, date: /^\d{4}-\d{2}-\d{2}$/.test(it.date || '') ? it.date : new Date().toISOString().slice(0, 10), desc: String(it.desc || '').trim().slice(0, 200) };
      if (it.featured) entry.featured = true;

      if (typeof body.html === 'string' && body.html.length) {
        await blob(`works/${id}.html`, Buffer.from(body.html, 'utf8').toString('base64'));
        entry.url = `works/${id}.html`;
      } else if (/^https?:\/\//i.test(it.url || '')) {
        entry.url = String(it.url).trim();
      } else {
        return res.status(400).json({ error: 'HTML 파일을 고르거나 작품 주소를 적어 주세요.' });
      }
      if (typeof body.thumb === 'string' && body.thumb.startsWith('data:image/jpeg;base64,')) {
        await blob(`thumbs/${id}.jpg`, body.thumb.split(',')[1]);
      }
      works = [entry, ...works];
      message = `작품 올리기: ${title}`;
    } else if (body.action === 'delete') {
      const id = String(body.id || '');
      const it = works.find(w => w.id === id);
      if (!it) return res.status(404).json({ error: '그 작품을 찾지 못했어요.' });
      works = works.filter(w => w.id !== id);
      if (id.startsWith('u-')) {
        // 올리기 메뉴로 올린 작품은 파일도 함께 지워요
        const files = await gh(`/git/trees/${head.tree.sha}?recursive=1`);
        for (const f of files.tree) {
          if (f.path === `works/${id}.html` || f.path === `thumbs/${id}.jpg`) tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null });
        }
      }
      message = `작품 빼기: ${it.title}`;
    } else {
      return res.status(400).json({ error: '알 수 없는 요청이에요.' });
    }

    await blob('works.json', Buffer.from(JSON.stringify(works, null, 1), 'utf8').toString('base64'));
    const newTree = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: head.tree.sha, tree }) });
    const commit = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: newTree.sha, parents: [headSha] }) });
    await gh(`/git/refs/heads/${branch}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
    return res.status(200).json({ ok: true, count: works.length });
  } catch (e) {
    return res.status(502).json({ error: '저장하지 못했어요. ' + e.message });
  }
};
