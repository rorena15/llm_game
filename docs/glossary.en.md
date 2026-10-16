# English edition glossary

Reference for every translator of `scenarios/en/*.json`, `story/en/sites.json`, `story/en/ending.json` and `docs/story.en.md`. When a term is listed here, use it exactly. Reuse of already translated UI strings (`app/src/i18n/en/*.ts`) is noted where it applies. See `docs/설계안.md` §17.

## 0. General rules

- Person names: surname first, Revised Romanization (RR) with common spellings, no hyphen in given names (Kim Cheolsu). Where the existing data already fixes an English given name (Yuna, Seoyeon, Jiwoo, Rex, Coco, Max), keep it. For 우 in given names use "woo" to match Jiwoo (Woojin, Seungwoo); for 훈 use "hun" (Jihun).
- Fixed fields (`id`, `requires`, `sources`, `keys` structure, variant ids, password values) are never translated. Only prose, labels, keywords and variant display values change.
- A clue `keyword` must appear verbatim in the body text it points at. Re-check each keyword after translating the body.
- Do not use an em dash as a comma substitute. The sign-off "— K" stays as is.
- Quotes: use straight double quotes for dialogue and documents. Keep 😀 emoji, "ㅎㅎ"-style laughter becomes "haha" or is dropped, "ㅠㅠ" becomes "T_T" or is dropped.
- Money: 250만원 = KRW 2.5 million, 3억 원 = KRW 300 million, 100,000,000 stays 100,000,000 (KRW in the header only). Keep dates (09/02, 2024-11-20) as they are.
- Names of the player's role: the player is a hired "hacker" (신입 해커 = new hacker). The client is always just "K".

## 1. People

Titles are the in-company titles used in the org chart. NPC `name` field format: "Title Surname Given" (e.g. "Director Kim Cheolsu"). In dialogue and labels people are addressed "Title + surname" (see section 2).

### 1.1 Scenario NPCs and core cast

| Korean | English | Role / note |
|---|---|---|
| K | K | Client. Real identity is Yoon Sangcheol. Never expand to a full name before the ending |
| 김철수 | Kim Cheolsu | HR Team director (fixed). 김 부장 = Director Kim |
| 이민수 | Lee Minsu | HR Team new hire, tutorial NPC. 이민수 사원 = Associate Lee; Minsu in narration |
| 박지현 | Park Jihyun | Dev Team 2 assistant manager (fixed). 박 대리 = Assistant Manager Park |
| 최수진 | Choi Sujin | Finance Team manager. 최 과장 = Manager Choi |
| 정우진 | Jung Woojin | Executive Office assistant manager. 정 대리 = Assistant Manager Jung |
| 강태호 | Kang Taeho | CEO. 대표 = the CEO; 대표님 (to him) = "the CEO" / "Mr. Kang" only if the speaker is outside the company |
| 윤상철 | Yoon Sangcheol | Regulator's inspector (검사역 = Inspector), 2nd on the club ranking. Also K. 윤 검사역 = Inspector Yoon |
| 윤재민 | Yoon Jaemin | Applicant whose interview score was altered; the CEO's nephew (조카) |
| 한기영 | Han Giyoung | Registered head of Meridian Advisory, the CEO's brother-in-law (처남); 3rd on the club ranking |

### 1.2 People in documents and mail

| Korean | English | Note |
|---|---|---|
| 오지훈 | Oh Jihun | HR Team staff, interviewer. Mail sender label "인사팀 오지훈" = "HR Team Oh Jihun" |
| 장서윤 | Jang Seoyun | Interviewer |
| 재현 | Jaehyun | Park's boyfriend, mail sender (given name only). Keep given name only |
| 아내 | Wife | Mail sender label in mission 1. Kim's wife, unnamed |
| 남편 | Husband | Choi's husband, unnamed |
| 우리 공주 | our princess | Choi's pet name for her daughter. Keyword "우리 공주 이름이랑 그날" must stay consistent with the mail body |
| 최유나 / 최서연 / 최지우 | Choi Yuna / Choi Seoyeon / Choi Jiwoo | Choi's daughter, variants a/b/c. Surname first everywhere, including the school page (the Korean data writes "Yuna Choi"; use "Choi Yuna" and update the keyword to match). Passwords stay lowercase `yuna`, `seoyeon`, `jiwoo` |
| 이도윤 | Lee Doyun | School award, 5th grader |
| 박하린 | Park Harin | School award, 6th grader |
| 정하은 | Jung Haeun | School award, 4th grader |
| 렉스 / 코코 / 맥스 | Rex / Coco / Max | Park's dog, variants a/b/c (`dog_en` values). 우리 막내 = "our baby" (keep as the owner's pet name for the dog; Instargram bio and mail must agree) |
| 서재형 | Seo Jaehyung | Club member, hole-in-one |
| 민경태 | Min Gyeongtae | Club member, longest drive |
| 오나연 | Oh Nayeon | Club member, best newcomer |
| 김도현 | Kim Dohyeon | Club ranking, 4th |
| 이정민 | Lee Jeongmin | Club ranking, 5th |
| 박 이사 | Board Director Park | = 박상규 below |

### 1.3 Org chart (www.corpx.com/people)

| Korean | English |
|---|---|
| 노경수 실장 (감사실) | Head Noh Gyeongsu (Audit Office) |
| 박상규 이사 (경영지원본부) | Board Director Park Sanggyu (Management Support Division) |
| 장윤호 팀장 (재무팀) | Team Lead Jang Yunho |
| 우병철 팀장 (총무팀) | Team Lead Woo Byeongcheol |
| 신혜린 팀장 (법무팀) | Team Lead Shin Hyerin |
| 임정호 전무 (개발본부) | Executive VP Lim Jeongho |
| 문태준 팀장 (개발 1팀) | Team Lead Moon Taejun |
| 오세영 팀장 (개발 2팀) | Team Lead Oh Seyeong. Mail sender "개발 2팀장" = "Dev Team 2 Lead" |
| 고민재 팀장 (플랫폼팀) | Team Lead Ko Minjae |
| 안소라 팀장 (QA팀) | Team Lead Ahn Sora |
| 탁은비 팀장 (디자인팀) | Team Lead Tak Eunbi |
| 서지훈 팀장 (정보보안팀) | Team Lead Seo Jihun |
| 배진우 소장 (기업부설연구소) | Lab Head Bae Jinwoo |
| 류성민 본부장 (영업본부) | Division Head Ryu Seongmin |
| 남기철 팀장 (기업영업팀) | Team Lead Nam Gicheol |
| 성나래 팀장 (공공영업팀) | Team Lead Seong Narae |
| 조한결 팀장 (파트너영업팀) | Team Lead Cho Hangyeol |
| 민예진 팀장 (고객성공팀) | Team Lead Min Yejin |
| 하승우 팀장 (마케팅팀) | Team Lead Ha Seungwoo |
| 재무팀장 (mail sender) | Finance Team Lead (= Jang Yunho) |

Org chart format: `Title Surname Given  N people` (marker rule in section 5). The people-count line for the CEO's direct reports keeps "1 people" as a literal unless the template is changed: write `1 person` only if the template marker allows it; otherwise use "1 people" (see section 5 note).

Name count: 43 persons (K included) plus 3 dog names.

## 2. Job titles

| Korean | English | Note |
|---|---|---|
| 대표 / 대표이사 | CEO | |
| 전무 | Executive VP | |
| 상무 | Senior VP | Not currently used |
| 이사 | Board Director | |
| 본부장 | Division Head | |
| 실장 | Head | Chief of Staff only if 비서실장. 감사실 실장 = Head of the Audit Office |
| 소장 | Lab Head | |
| 팀장 | Team Lead | |
| 부장 | Director | "Director Kim". Not "Manager" |
| 과장 | Manager | |
| 대리 | Assistant Manager | |
| 사원 / 신입 사원 | Associate / new hire | "Associate Lee" in address; "new hire" or "staff" in prose |
| 검사역 | Inspector | Regulator's examiner |
| 담당자 | person in charge | |
| 책임자 | head | e.g. 개발 2팀 책임자 = head of Dev Team 2 |

Address: NPCs use "Title + surname" ("Director Kim", "Manager Choi"). Never "Mr. Kim" for colleagues. Addressing the CEO directly: "Sir" / "the CEO"; Jung refers to him as "the CEO". 선배님 (to seniors) = "senior" or by title; 부장님 = "Director Kim" or "Director" alone.

## 3. Organizations, places, sites, brands

| Korean | English | Note |
|---|---|---|
| CorpX | CorpX | Stays. 주식회사 CorpX = CorpX Co., Ltd. (matches i18n footer) |
| CorpX Works | CorpX Works | Product (e-approval and messenger) |
| CorpX Pay | CorpX Pay | Product |
| CorpX 타워 | CorpX Tower | |
| Meridian Advisory Pte. Ltd. | Meridian Advisory Pte. Ltd. | Singapore shell company. Stays |
| 인스타그램 (fake SNS) | Instargram | From i18n, stays; URL www.instargram.com |
| 나치반 (search portal) | Nachimban | From i18n |
| 한빛초등학교 | Hanbit Elementary School | www.hanbit-es.kr stays |
| 그린힐 컨트리클럽 / 그린힐 CC | Greenhill Country Club / Greenhill CC | www.greenhill-cc.com stays. 회원 기록실 = Members' Record Room; 클럽 기록실 = club record room |
| 그린뷰 (clubhouse restaurant) | Green View | |
| 골프존몰 (spam, trash) | Golfzone Mall | Fictional brand, natural rendering |
| 정장몰 | Suit Mall | |
| 멍멍마켓 | Woof Market | |
| 영어나라 | English Land | |
| 꿀잠약국 | Sweet Sleep Pharmacy | |
| 사내식당 | Cafeteria | Mail sender |
| 서울 / 강남구 / 강남 | Seoul / Gangnam-gu / Gangnam | |
| 테헤란로 | Teheran-ro | From i18n |
| 역삼동 / 역삼역 | Yeoksam-dong / Yeoksam Station | "Exit 3 of Yeoksam Station, Line 2" |
| 2호선 | Line 2 | 지옥철 = "hell train" / "packed train" |
| 한강 | Han River | |
| 싱가포르 | Singapore | |
| 서울 강남구 테헤란로 CorpX 타워 12~18층 | CorpX Tower, Teheran-ro, Gangnam-gu, Seoul, floors 12-18 | |

## 4. Recurring game terms

| Korean | English | Note |
|---|---|---|
| 인사팀 | HR Team | |
| 재무팀 | Finance Team | |
| 총무팀 | General Affairs Team | |
| 법무팀 | Legal Team | |
| 개발 1팀 / 개발 2팀 | Dev Team 1 / Dev Team 2 | Full: Development Team 2 on first mention |
| 개발본부 | Development Division | |
| 경영지원본부 | Management Support Division | |
| 영업본부 | Sales Division | |
| 플랫폼팀, QA팀, 디자인팀, 마케팅팀 | Platform Team, QA Team, Design Team, Marketing Team | |
| 기업영업팀 / 공공영업팀 / 파트너영업팀 | Enterprise Sales / Public Sector Sales / Partner Sales Team | |
| 고객성공팀 | Customer Success Team | |
| 정보보안팀 | Information Security Team | Used in the phishing notice |
| 보안팀 | Security Team | Same team in casual speech; keep distinct from Information Security Team only in the org chart |
| IT지원팀 | IT Support Team | |
| 기업부설연구소 | Corporate R&D Lab | |
| 비서실 | Executive Office | |
| 감사실 | Audit Office | Org chart unit |
| 감사팀 | Audit Team | Used by the player as a pretext keyword (NPC rule `감사팀` = "audit team") |
| 사내망 | intranet | 사내망 비밀번호 = intranet password; screen title "Intranet Login" (i18n) |
| 사내 게시판 | internal bulletin board | |
| 사내 메신저 | internal messenger | |
| 결재 / 전자결재 | approval / e-approval | 결재 올렸습니다 = "I've submitted it for approval" |
| 공채 / 공개 채용 | open recruitment | 하반기 공채 = second-half open recruitment |
| 합격선 / 합격 / 불합격 | passing score / Pass / Fail | |
| 면접 평가표 | interview evaluation sheet | |
| 면접관 | interviewer | |
| 접대비 | entertainment expenses | |
| 법인카드 | corporate card | |
| 법인 계좌 | corporate account | |
| 용역비 | service fee | 해외 컨설팅 용역비 = overseas consulting fee; 해외 시장 조사비 = overseas market research expense |
| 결산 | closing (quarterly close) | "settling the books" in casual speech |
| 상품권 | gift certificate | |
| 처남 | brother-in-law | Wife's brother |
| 조카 | nephew | |
| 규제 기관 / 정기 검사 | regulator / regular inspection | |
| 검사 대상 | inspected company | |
| 연차 / 반차 | annual leave / half-day | |
| 야근 | overtime | |
| 가정통신문 | school newsletter | |
| 생신 | birthday | Honorific; no difference in English. 생신 행사 = birthday event |
| 수사보드 | Case Board | From i18n |
| 단서 / 추론 | clue / deduction | From i18n |
| 비밀번호 | password | |
| 보도자료 | press release | |
| 하이라이트 '까먹지 말기' | Highlight "Don't Forget" | Instargram highlight reel title. Clue keyword must match the body |
| 우리 막내 | our baby | See section 1.2 |

Variant display values (the `*_ko` / `*_read` fields are shown to the player, so translate them; the ids and passwords stay):

| Field | Korean | English |
|---|---|---|
| sky_ko | 파란 하늘 / 하얀 눈 / 붉은 노을 | blue sky / white snow / red sunset |
| bday_ko, bday_read | 7월 7일 / 칠월 칠일 | July 7 / the seventh of July |
| | 3월 21일 / 삼월 이십일일 | March 21 / the twenty-first of March |
| | 11월 4일 / 십일월 사일 | November 4 / the fourth of November |
| bmd_ko, bmd_read | 3월 15일 / 삼월 십오일 | March 15 / the fifteenth of March |
| | 8월 22일 / 팔월 이십이일 | August 22 / the twenty-second of August |
| | 1월 9일 / 일월 구일 | January 9 / the ninth of January |
| byy ("58년생") | 58년생 | born in '58 |
| yy ("23년") | 23년 | '23 |

## 5. Site markers (FIXED, copy as is)

The web templates search page bodies for these. Do not rephrase.

| Korean marker | English marker | Where |
|---|---|---|
| `[메뉴]` | `[Menu]` | Corp site home, menu block header |
| tag `필독` (as `[필독]`) | `Must read` (`[Must read]`) | Notice page, pinned item |
| section tag containing `하이라이트` (`[스토리 하이라이트]`) | tag containing `Highlights` (`[Story Highlights]`) | Instargram profile |
| section tag containing `게시물` (`[최근 게시물]`) | tag containing `Posts` (`[Recent Posts]`) | Instargram profile |
| head-count cell `N명` | `N people` | Org chart and company overview (임직원 412명 = 412 people). Use "people" for every N, including 1 |
| status `마감` | `Closed` | Careers page |
| status `상시` | `Ongoing` | Careers page ("상시 채용" = "Ongoing") |
| menu item `알림` | `Notices` | Corp menu (= i18n `corp.notices`) |
| default school board name `학교 소식` | `School News` | School page title, matches i18n gnb |

Other bracket tags on the same pages (not markers, but keep consistent): [보안] Security, [안내] Info, [행사] Event, [복지] Benefits, [수상] Award, [알림] (school) Notice, [급식] Lunch, [방과후] After-school, [안전] Safety, [인사말] Greeting, [회사 개요] Company Overview, [오시는 길] Getting Here, [주요 사업] Main Businesses, [숫자로 보는 CorpX] CorpX in Numbers, [오늘의 소식] Today's News, [보도자료] Press Releases, [채용 공고] Openings, [채용 절차] Hiring Process, [인재상] Who We Look For, [복리후생] Benefits, [걸어온 길] Our History, [이달의 기록] Records of the Month, [클럽 소식] Club News, [이번 주 베스트 스코어] This Week's Best Scores.

Also: 돌아가기 = Back; 회사 소개 About Us; 사업 분야 Business; 연혁 History; 보도자료 Press; 인재 채용 Careers; 조직도 Org Chart.

## 6. Speech mapping

Korean speech level is dropped in English; only formality and tics carry over.

| NPC | Korean level | English register | Verbal tics |
|---|---|---|---|
| Director Kim Cheolsu | hage (하게체) | neutral, patronizing | 자네 = condescending address ("young man", "son", sparingly; "kid" if blunt); 허허 = "Heh heh" / "Hah"; short pompous statements, "Hmm, I see.", 말조심하게 = "Watch your tongue." Never apologizes |
| Associate Lee Minsu | haeyo (해요체) | neutral, nervous | Apologizes ("Sorry, I'm still new"), exclamation marks, trails off with "...", polite but unsure; calls others "senior" |
| Assistant Manager Park Jihyun | haeyo | neutral, chatty/casual-leaning | ㅎㅎ = "haha", "omg", "no way", many exclamations; calls the dog "my baby"; brags freely; stays polite to strangers |
| Manager Choi Sujin | haeyo | neutral, curt | Short clipped replies ("Yes.", "Fine."); businesslike; warms into longer sentences only for her daughter; "Let's keep it to work." |
| Assistant Manager Jung Woojin | hapsho (합쇼체) | formal | Complete polite sentences, no contractions ("I am afraid I cannot discuss that."), "Understood.", "I would appreciate your understanding."; never shows irritation; loosens slightly when his fatigue is acknowledged |

Defaults for any unlisted NPC: hage = neutral with patronizing tics, haeyo = neutral, hapsho = formal, banmal = casual (Park's boyfriend Jaehyun in mail and Choi's mail to her husband are banmal = casual, contractions allowed).

The guard's tone check is off in English, so tics live in the persona text, not in checks.
