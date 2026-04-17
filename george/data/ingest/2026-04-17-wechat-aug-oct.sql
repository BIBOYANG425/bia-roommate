-- WeChat ingest — 2026-04-17T07:24:02.887Z
-- Source: data/wechat/bia-2024.raw.json (BIA 2024 WeChat group, --since 2024-08-01 --until 2024-10-31 --max-threads 200)
-- Generated: 204 candidate rows across 134 thread blocks
-- Reviewed 2026-04-17: 7 rows deleted (2 empty answers, 4 off-tone/problematic, 1 factual
-- hallucination). Final: 197 rows — 63 freshman_faq, 123 campus_knowledge, 11 course_tips.

-- thread fb3eb985 | 2024-08-09 | 198 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('USC附近酒店离学校最近的是哪家？', '离USC最近的酒店就是USC Hotel，在Marshall对面，过个马路的距离，不过现在价格已经涨到300多刀了。附近其他酒店也差不多这个价格。', 'housing', 'fb3eb985');

-- thread e9f4efd1 | 2024-08-14 | 160 msgs
insert into campus_knowledge (category, title, content) values ('transport', '开学前在Bookstore门口买二手自行车', '开学季USC Bookstore前面会有人摆摊卖自行车，价格比较便宜，适合刚到的新生入手代步工具。');
insert into campus_knowledge (category, title, content) values ('transport', 'Scooter建议买二手，贬值极快', 'USC周边scooter贬值速度很快，建议在XHS、eBay或群里找二手，价格大概$100左右。USC校内路很宽，骑车不会被骂。');
insert into campus_knowledge (category, title, content) values ('tips', 'USC Convocation在奥运场馆举行，需凭ticket入场', 'USC新生Convocation在奥运场馆举行，7:45开始排队，8点入场，ticket信息在学校发的email里，记得提前报名。');

-- thread 5102b05d | 2024-08-14 | 133 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('大家在la一个月生活费大概要多少呀（不算住宿）', '不算住宿的话2k到3k左右，看你买不买车、出不出去玩、买不买奢侈品。最基础的话1k也能活，但没什么社交生活。衣服、Uber、偶尔出去吃饭、化妆品、交通话费这些加起来建议预算1k起步。', 'general', '5102b05d');

-- thread 2c40632c | 2024-08-18 | 124 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('如果我23交完钱 后来又加了一门课 会要我latefee吗', '18个学分以内都不用交钱。你不超过16个学分，开学后3周内都可以加课换课drop课', 'academics', '2c40632c');
insert into freshman_faq (question, answer, category, source_thread_id) values ('考驾照方不方便呀 需不需要找教练啥的 如果国内有驾照了的话 一般需要多久能考出来呀', '挺方便的，驾照很简单。国内有的话2周内能考出来。笔试有中文不难，小红书可以搜搜。可以线上预约笔试，然后立马约路考。路考就是在学校开着转一圈，注意变道记得脑袋看后面有明显动作就行。但路考的时候需要借同学的车', 'admin', '2c40632c');
insert into freshman_faq (question, answer, category, source_thread_id) values ('看病的话去哪里 insurancecard去哪领呢', '保险卡需要线上申请邮寄才能拿到实体卡，电子版本可以在网站存在wallet里面。看病的话：不急的预约在campus里的student health center；可以等3-4小时的直接google urgent care；快死了的打911或者打车去大医院的emergency room。注意医保不包dental', 'admin', '2c40632c');

-- thread af0b122e | 2024-08-28 | 119 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('怎么drop呢', '在web reg里面的mycourse bin先点unscheduled 再点drop', 'academics', 'af0b122e');
insert into freshman_faq (question, answer, category, source_thread_id) values ('在哪里可以用swipe吃饭啊', '食堂，三个有趣的食堂。还有一个是inferno。一个月可以两次在ronald tutor center用swipe', 'food', 'af0b122e');
insert into freshman_faq (question, answer, category, source_thread_id) values ('课能absent几次在哪看', 'syllabus', 'academics', 'af0b122e');

-- thread 23d9cf4c | 2024-08-23 | 99 msgs
insert into campus_knowledge (category, title, content) values ('study', 'USC图书馆对比：Leavy vs Doheny', 'Leavy图书馆座位多、充电方便，地下一层是conversation and talk floor可以聊天；Doheny氛围更像传统library但充电不太方便。');
insert into campus_knowledge (category, title, content) values ('food', 'Village食堂导航名称', 'USC Village的食堂正式名称是McCarthy Honor Dining Hall，导航搜这个名字。');
insert into campus_knowledge (category, title, content) values ('local', 'Apex公寓附近有Ralphs超市', 'Apex公寓附近有一家Ralphs超市，里面东西挺全的，适合买日常食材。');

-- thread f7ee7c35 | 2024-08-22 | 98 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'USC活动入场门规则：学生走8号门，访客走23号门', '学生进校要从8号门进，不能从23号门进。带guest的话guest走23号门。8号门在南面，要绕半圈。附近有停车场。');
insert into campus_knowledge (category, title, content) values ('transport', '8号门附近有停车场', '停车场入口在8号门那边，从parking那里可以进入校园。');

-- thread 45a0572d | 2024-08-27 | 83 msgs
insert into course_tips (course_code, professor, tip, sentiment, source_thread_id) values ('CHEM 103', null, 'Environmental Science专业上的是CHEM 103，而且test都是online，还会drop lowest grade，比105b轻松很多。', 'positive', '45a0572d');

-- thread 3a93d92b | 2024-08-14 | 79 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('在美国用Apple Card方便吗？', 'Apple Card需要SSN，建议去USC Village的Bank of America开户，walk-in就行不用预约，半小时搞定。可以先开信用卡（大概率是押金卡），积攒信用记录，然后下一步办Chase，再之后搞Amex，路径清晰。', 'admin', '3a93d92b');
insert into freshman_faq (question, answer, category, source_thread_id) values ('在USC校园里需要买scooter吗？值得入手吗？', '100%值得，再也不用担心迟到了。电滑板车好用，还能带进教室。一般的电滑板车300-500刀。买了之后一定要配一把好锁，见过自行车只剩下车轮和锁的情况。校园内20mph够用了。', 'general', '3a93d92b');
insert into freshman_faq (question, answer, category, source_thread_id) values ('自行车在USC校园会被偷吗？', '锁不好的话建议别骑。虽然不常见，但也不是没有，见过只剩下车轮和锁的情况，所以要买一把好锁。', 'general', '3a93d92b');

-- thread c9570c0a | 2024-08-13 | 71 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('国内的卡货币是美金怎么付学费', '国内的卡转到你美国储蓄卡里，然后你用美国卡网上付。USC不能电汇了，从前两年就不行了，国际生只能用flywire或者另一个网站付款。', 'admin', 'c9570c0a');

-- thread 26cdb2bd | 2024-08-27 | 69 msgs
insert into course_tips (course_code, professor, tip, sentiment, source_thread_id) values ('CRIT 150', null, '专业必修课，有人反映女老师讲课音调平淡容易催眠；去年男老师教得差但课不难；essay grading不算难，强度应该不至于太大，但有说要写三篇paper。', 'mixed', '26cdb2bd');
insert into course_tips (course_code, professor, tip, sentiment, source_thread_id) values ('ITP 115', null, '课本身很简单，easy A，即使老师评分不高也能拿A，适合用来补学分。', 'positive', '26cdb2bd');
insert into course_tips (course_code, professor, tip, sentiment, source_thread_id) values (null, null, '有人推荐睡觉课（sleep课）作为水课/easy A选项，据说老师再坏也能拿A。', 'positive', '26cdb2bd');

-- thread 1497ed42 | 2024-08-19 | 65 msgs
insert into campus_knowledge (category, title, content) values ('local', '开学后可通过RA申请换宿舍', 'USC开学后Housing会发邮件说明换宿舍流程，可以直接问自己的RA申请。有人曾在学期开始一个月后成功从New North换到Parkside，所以并非完全不可能，但名额有限。');
insert into campus_knowledge (category, title, content) values ('local', 'USC宿舍check in需提前约时间', '拿到USC Card后还需要按预约时间去housing办理check in，不是直接刷卡进宿舍。如果到了check in地点没人，可能是还未到你预约的时间段。');

-- thread f101d5e0 | 2024-08-23 | 61 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('书一般是买还是租呢？', '其实一般z library，现在很多课都不用课本了，教授纯用ppt。也可以用淘宝找PDF，几毛钱一本。还有Brightspace看announcement里的syllabus和书本要求。', 'academics', 'f101d5e0');
insert into freshman_faq (question, answer, category, source_thread_id) values ('我们有什么网站能查每门课的教材吗，还是等第一周上课了老师说？', 'Brightspace看announcement，里面会有syllabus和书本要求。', 'academics', 'f101d5e0');
insert into freshman_faq (question, answer, category, source_thread_id) values ('lyft pass怎么申请呢？', '填表申请，晚上的share Lyft是无限制的，全免费。一般在主校区的话选UPC。', 'general', 'f101d5e0');

-- thread 40879abe | 2024-08-22 | 57 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('咱们movein 和取卡都要啥材料来着', '取id需要证件，护照驾照什么的。movein需要那个movein的二维码，在你的housing portal上。', 'housing', '40879abe');

-- thread 8fdb3c36 | 2024-08-16 | 56 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('药一定要处方嘛', '处方药要处方，非处方药直接带就行。如果是一直在吃的处方药，可以去医院跟医生说你马上出国，让他帮你开个处方。另外不能带含有黄麻碱的药。', 'admin', '8fdb3c36');

-- thread 26db6f77 | 2024-09-03 | 55 msgs
insert into campus_knowledge (category, title, content) values ('food', 'PKS 晚饭避雷：Pizza和意面质量不稳定', 'PKS晚饭踩坑记录：pizza烤糊了还放出来（包括BBQ chicken pizza），意面变成面糊+空心粉组合。奶油意面/海鲜alfredo只在brunch有，晚上没有。晚饭谨慎选择。');

-- thread 86184efd | 2024-08-28 | 54 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('想上的课要是closed了的话，给教授发邮件有用嘛', '可以试试，理由好点，说非你不可，都挺通融的', 'academics', '86184efd');
insert into freshman_faq (question, answer, category, source_thread_id) values ('转marshall难吗', '3.6以上GPA加3门pre req，minor好像都行', 'academics', '86184efd');
insert into freshman_faq (question, answer, category, source_thread_id) values ('我选课是不是其实可以选其他学院的课', '可以，就当选修课上了', 'academics', '86184efd');

-- thread 319bb3e4 | 2024-09-05 | 51 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'USC Club Fair 陆续举行', 'USC的club fair不是只有一次，会陆陆续续举行多场。有sport类（射箭archery、龙舟dragon boat）、science类、religious类等各种club，地点在学校中间（campus中心区域）。');
insert into campus_knowledge (category, title, content) values ('food', 'Law School Cafe有Boba', 'USC Law School的cafe里有boba可以买，想喝奶茶可以去那边。');

-- thread 421cf0c2 | 2024-08-15 | 50 msgs
insert into campus_knowledge (category, title, content) values ('food', 'Dining Plan换成Dining Dollar更划算', 'USC默认的dining plan是只有swipe（食堂刷卡），建议换成dining dollar，因为可以在外面吃，不会局限于食堂。食堂一个学期容易吃腻，dining dollar灵活很多。需要自己主动去change一下。');
insert into campus_knowledge (category, title, content) values ('food', 'USC食堂适合健身党', 'USC食堂蛋白质、碳水、膳食纤维搭配齐全，非常适合健身的人吃。USC健身房也有很多猛人，健身氛围浓厚。');
insert into campus_knowledge (category, title, content) values ('tips', 'USC附近有5G信号覆盖', 'USC校园附近已经有5G+信号覆盖，如果手机显示LTE是正常现象，用的是4G网速，不代表没有激活成功。');

-- thread ec46c838 | 2024-08-17 | 47 msgs
insert into campus_knowledge (category, title, content) values ('buildings', '学生卡取卡地点', '学生卡（USC ID）直接去校内办公室取，在图书馆跟前，靠草坪那边。记得带护照。不需要提前预约，到学校直接去就可以。');
insert into campus_knowledge (category, title, content) values ('tips', 'Move-in需要预约', 'Move-in需要在housing portal上提前预约，别忘了操作。');
insert into campus_knowledge (category, title, content) values ('transport', '到美国先用漫游/临时卡过渡', '建议先开国内漫游撑着，到了美国再办本地卡。T-Mobile一个月约200人民币，AT&T prepaid unlimited一个月$50，性价比不错。前几天事多，能少一事先少一事。');

-- thread 413966a4 | 2024-08-14 | 43 msgs
insert into campus_knowledge (category, title, content) values ('tips', '校园内自行车失窃问题', 'USC校园内自行车零件经常被盗，包括轮胎和车座都有人偷。建议考虑用电滑板或scooter代替自行车出行，相对安全也更方便。');
insert into campus_knowledge (category, title, content) values ('food', 'USC Meal Plan使用方式', '使用USC学生卡进食堂，门口工作人员会直接刷卡，里面是all you can eat自助餐形式。');
insert into campus_knowledge (category, title, content) values ('tips', '宿舍提前入住申请', '如果想提前move in，需要填写一个housing的form表格申请，可以联系USC housing询问具体流程。');

-- thread 0e39d579 | 2024-09-11 | 39 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('请问有人知道uscard丢了去哪里补办吗', '先上myusccard网站重新申请，申请完了去取卡的地方取，大概一天后可以取到。不能直接walk-in当场办，需要先网上申请。', 'admin', '0e39d579');

-- thread 1eefb010 | 2024-08-07 | 38 msgs
insert into campus_knowledge (category, title, content) values ('food', 'USC Dining Plan建议：住校外选Community Plan + 25 meals', '住校外的同学建议先买Community Plan，选25 meals那档（不推荐50，因为dining hall晚上6点前就关了不实用）。Dining dollar不够了可以直接在网站上充值。');
insert into campus_knowledge (category, title, content) values ('food', 'USC三大食堂有三文鱼饭', 'USC dining hall有三文鱼饭，值得去试试，但注意dining hall一般晚上6点前就停止供应了。');

-- thread 9bda4613 | 2024-08-19 | 38 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('住宿舍考驾照的话地址证明用什么？住宿有包含姓名租金地址的合同吗？', '可以用医疗保险卡做地址证明——申请一张保险卡邮寄到宿舍，拿实体卡去DMV。注意USC旁边那个DMV不认学校宿舍的文件，建议去Santa Monica或其他地方的DMV。去的时候多带几封有你地址的信封，别给他们拒绝你的机会。如果需要住房合同，可以打印lease前几页，只要有name和address就行，但学校宿舍的合同有些DMV不认。', 'admin', '9bda4613');

-- thread 89a131ae | 2024-08-21 | 38 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'USC ID卡领取地点', '领取USC ID卡要去USCard Service，注意不要选成Health Campus（在DTLA），那个是校外的HSC OneStop，不是主校区的办理地点。');
insert into campus_knowledge (category, title, content) values ('tips', '领取USC ID卡所需证件', '办理USCard需要携带government photo ID，护照或驾照均可。');
insert into campus_knowledge (category, title, content) values ('tips', '宿舍内使用变压器', '有同学在宿舍内使用变压器，据说不会被制裁，有室友亲测过。国内电压电器带来可考虑配变压器使用。');

-- thread 209aecc1 | 2024-08-23 | 38 msgs
insert into campus_knowledge (category, title, content) values ('buildings', '排球场在Lyon Center', 'USC室内排球场在Lyon Center，进去之后上楼。沙排场在外面，室内排球/篮球/羽毛球都在Lyon Center多功能场馆。');
insert into campus_knowledge (category, title, content) values ('tips', 'Club Fair时间', 'Club Fair一般在开学第一周和第三周各有一次，可以去了解各种社团。');

-- thread 444888a2 | 2024-09-07 | 35 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'DPS紧急联系电话', 'USC DPS (Department of Public Safety) 电话：紧急情况 (213) 740-4321，非紧急情况 (213) 740-6000。号码也印在USC ID卡背面。');

-- thread 871656a3 | 2024-08-23 | 34 msgs
insert into campus_knowledge (category, title, content) values ('local', 'USC附近购物中心推荐', '最近的是downtown附近的mall，有Zara、H&M、优衣库。稍远的有The Grove和Westfield，在西边UCLA那边方向，选择更多。');
insert into campus_knowledge (category, title, content) values ('tips', 'USC附近理发不好找', '学校附近30分钟内基本没有靠谱的理发店，Ktown韩国人剪的也一般。建议去小红书搜索口碑好的理发师。');

-- thread 1a0dd478 | 2024-09-23 | 34 msgs
insert into campus_knowledge (category, title, content) values ('local', 'The Broad Museum值得一去', 'The Broad超推荐！一楼有个展叫''all about love''（波普风格，看个人口味），楼上其他展很顶。装置艺术很出片，有无限镜像类型的现代艺术，适合一个人或情侣去体验。');
insert into campus_knowledge (category, title, content) values ('tips', 'The Broad周边街区安全', 'The Broad附近街区比较安全干净，适合出门拍照，没什么流浪汉（hobo），摄影课外拍可以考虑这一带。');

-- thread 9c8b4ec0 | 2024-08-02 | 32 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('难道要到美国了才能选课吗，新生第一次选课是不是必须到了美国才能选？', '不用，在国内就可以选，只要到了你的registration date就可以选了，不影响的。本科生用stu60系统，研究生是stu50不一样。', 'academics', '9c8b4ec0');
insert into freshman_faq (question, answer, category, source_thread_id) values ('我们学校是不是选超过18个学分就要多交钱啊，还是低于18个学分也是按学分收钱？', '对，超过18学分要多交钱，每个学分多交2200。', 'academics', '9c8b4ec0');
insert into freshman_faq (question, answer, category, source_thread_id) values ('GE-D有推荐的课吗，我看psyc100被选完了', '他们说science of sports挺好玩的', 'academics', '9c8b4ec0');

-- thread febab641 | 2024-08-10 | 31 msgs
insert into campus_knowledge (category, title, content) values ('local', 'USC Hotel到Parkside步行路线', 'USC Hotel走到Parkside约2公里，导航会绕学校外面走，但实际绕学校内部反而更近一点。');
insert into campus_knowledge (category, title, content) values ('local', 'USC Hotel订房注意事项', 'USC Hotel可能需要最低三晚起订，且房间快满时可以考虑换downtown的酒店，或者几个人合租Airbnb更经济实惠。');

-- thread 26eead2e | 2024-08-26 | 31 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('怎么dropout课？前三个星期是可以的对吧', '我刚drop完，是可以的', 'academics', '26eead2e');

-- thread 2b22ce24 | 2024-09-05 | 31 msgs
insert into course_tips (course_code, professor, tip, sentiment, source_thread_id) values ('DANC 185A', null, 'Hip hop舞蹈课，2学分，无脑A，好玩推荐', 'positive', '2b22ce24');

-- thread 883df040 | 2024-08-10 | 30 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'USC Card 领取地址', '取USC Card不需要预约，直接去 620 USC McCarthy Way, Los Angeles, CA 90089，带护照就行，人到即可。');
insert into campus_knowledge (category, title, content) values ('tips', 'Move-in 流程', 'Move-in第一天可以先去宿舍check in，工作人员会给你钥匙或临时卡，USC Card之后再单独去取即可。');
insert into campus_knowledge (category, title, content) values ('buildings', 'Parkside宿舍位置特点', 'Parkside宿舍比较偏僻，相对孤立，优点是离Viterbi工学院和IYA比较近。');

-- thread d54277ea | 2024-09-15 | 30 msgs
insert into campus_knowledge (category, title, content) values ('tips', '选Roski课程解锁免费Adobe全家桶', '选一节Roski的课（比如ART 150）就可以获得免费Adobe全套访问权限，而且选完之后access会一直保留。SCA学生也可以用这个方法薅羊毛。');
insert into campus_knowledge (category, title, content) values ('buildings', 'Ann以外的Adobe途径：Digital Media Lab', 'Annenberg学生可以去digital media lab申请账号来获取免费Adobe，不是直接自动开通的，需要去那边要一个账号。');

-- thread f7ecaac5 | 2024-09-16 | 30 msgs
insert into course_tips (course_code, professor, tip, sentiment, source_thread_id) values ('ITP 165', null, '无coding背景强烈建议上115而不是165', 'mixed', 'f7ecaac5');
insert into course_tips (course_code, professor, tip, sentiment, source_thread_id) values ('BUAD 304', null, '需要买Harvard Business Publishing课包，教材用Kinicki Organizational Behavior第3版，老师有discount+connect链接；有很多小题目（人格测试类）是送分的，记得完成', 'positive', 'f7ecaac5');

-- thread 83ddae5d | 2024-09-16 | 30 msgs
insert into campus_knowledge (category, title, content) values ('study', 'Watt Hall 深夜赶作业', 'Watt Hall（Roski艺术学院）可以深夜留在里面赶作业，有同学凌晨还在里面做草图和4视图作业。');
insert into campus_knowledge (category, title, content) values ('buildings', 'Roski在Watt Hall', 'USC Roski美术学院位于Watt Hall，做设计/艺术类作业的同学可以去那里找到自习空间。');

-- thread 9ff527ca | 2024-08-17 | 28 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('那个micro seminar是一定要去还是选择性的呀，会有啥关系不', 'Micro seminar好像可以不去，没有什么关系的', 'academics', '9ff527ca');
insert into freshman_faq (question, answer, category, source_thread_id) values ('那个tb test需要约吗还是和疫苗一样直接去', 'tb test直接去，国内好像做不了', 'admin', '9ff527ca');

-- thread 4417820e | 2024-08-23 | 26 msgs
insert into course_tips (course_code, professor, tip, sentiment, source_thread_id) values ('CTCS 190', null, '这门课是SCA的GE课，所有SCA专业都必须上，几百人在剧院里上课。教材的事先别急，等第一节课教授会说，可以直接问有没有免费PDF。', 'mixed', '4417820e');

-- thread f480add3 | 2024-08-29 | 26 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'Involvement Fair 在 Alumni Park 举办', 'USC Involvement Fair 在 Alumni Park 举办（DMC旁边），Trojan雕像附近能看到各club的桌子，很显眼。时间一般是11am-1pm，不需要提前signup，直接去就行。');

-- thread 73f87f82 | 2024-08-29 | 25 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'Lyon Center羽毛球时间', 'Lyon Center有羽毛球场，周一三五六 2-4点可以打');
insert into campus_knowledge (category, title, content) values ('tips', 'PED羽毛球场自装网', '去PED打球需要自己装网，有个特殊装置可以一次装三片场');

-- thread 8c42f40a | 2024-10-02 | 24 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'Tapper Hall旁边撸狗活动', 'Tapper Hall旁边有时会有学校组织的撸狗放松活动，一次放9个人进去，每波结束后狗狗休息10分钟再放下一波，活动一般到下午5点结束。有人反映狗狗看起来很累，工作人员态度一般，介意的话可以酌情考虑要不要去。');
insert into campus_knowledge (category, title, content) values ('tips', 'USC Bookstore对面有Water Festival', 'USC Bookstore对面有时会举办Water Festival活动，路过可以留意一下。');

-- thread bfe2da48 | 2024-08-23 | 23 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'USC社团招新时间', 'USC社团招新分两批：一部分在开学第一周，另一部分在第三周。');
insert into campus_knowledge (category, title, content) values ('buildings', '宿舍饮水机情况', 'Art & Humanities楼走廊有饮水机，但Parkside Apartment和Nemirovsky等宿舍可能没有。可以去食堂接水带回去，或者买过滤器/整箱水解决。');

-- thread ae2031bb | 2024-08-28 | 23 msgs
insert into campus_knowledge (category, title, content) values ('transport', '停车场注意事项', '停车时必须停在自己买permit的停车楼，停错了可能被罚款大概$50-60。不要停在reserve区域。');
insert into campus_knowledge (category, title, content) values ('tips', '课程Location查找', '如果USC Schedule of Classes上没有显示课程location，可以右上角找location按钮，或者查看Brightspace上的announcement，还不行就直接发邮件问教授。');

-- thread 81ccc432 | 2024-08-19 | 22 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('开学第一天的流程是啥样的，直接去教室吗？', '到点直接去教室就好。开学第一天是8/26（周一），25号是周日不上课。', 'academics', '81ccc432');
insert into freshman_faq (question, answer, category, source_thread_id) values ('Move in可以开车进去搬东西吗？好多行李', '可以，临时停在宿舍下面，但是会很堵。', 'housing', '81ccc432');

-- thread 12b1c90e | 2024-08-19 | 22 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'USC健身课预约', 'USC Rec Sports健身课session挺多的，不用太担心约不上。官网查课表：https://recsports.usc.edu/programs-and-classes/fitness/group-ex-classes/ 注意暑假期间可能是summer schedule。');
insert into campus_knowledge (category, title, content) values ('buildings', 'USC羽毛球场地', '学校没有专门的羽毛球场，但Lyon Center和PE楼里都可以打。学校也有羽毛球俱乐部可以加入。');

-- thread 41b485a4 | 2024-09-08 | 22 msgs
insert into campus_knowledge (category, title, content) values ('local', 'Beaudry公寓停车场安全问题', 'Beaudry公寓停车场有车被盗记录，有人的皮卡在公寓parking被偷，找房时需注意停车安全问题。');
insert into campus_knowledge (category, title, content) values ('local', 'New North宿舍区听取前辈建议', 'USC New North区域住宿体验不佳，建议新生选宿舍时多听学长学姐意见，可以避免踩坑。');

-- thread 53801e1a | 2024-08-08 | 21 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'Wire Transfer 多转的钱变credit', '交学费wire transfer时学校收取$12.5手续费，且最低转账额为$50。多转的钱会自动变成下个学期的credit，不用担心。');
insert into campus_knowledge (category, title, content) values ('transport', 'CSGA提供接机服务', 'USC的CSGA（中国学生学者联合会）提供接机服务，但需要提前报名，临近开学报名可能已截止，建议尽早预约。');

-- thread 0cebbda9 | 2024-09-10 | 21 msgs
insert into campus_knowledge (category, title, content) values ('food', 'USC附近中餐外卖可定制菜品', '校园南大门附近有中餐配送/自提服务，支持定制菜品（如青椒肉丝、刀削面等），有统一配送时间，太晚无法配送。取餐地址在南大门附近。');

-- thread 26e77f1a | 2024-08-17 | 20 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'USC健身房使用指南', '学校有两个学生可以用的健身房：一个在Village，一个是Lyon Center（Webb Tower对面，特别大）。进去需要学生卡+填一份waiver，waiver在健身房现场就能填。Lyon Center里可以打篮球、排球、羽毛球、壁球等。注意周末不开门。');

-- thread e932dd26 | 2024-08-22 | 20 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('刚拿驾照然后lease车的话 每个月保险会不会超贵啊啊', '差不多300刀一个月？还是一个比较普通的车。年龄大车龄大就会越来越低，没有accident和ticket保险也会降低，车的颜色也有学问，颜色越鲜艳越贵', 'general', 'e932dd26');
insert into freshman_faq (question, answer, category, source_thread_id) values ('在哪打针', '在student center地下一层', 'admin', 'e932dd26');

-- thread 11337700 | 2024-09-13 | 19 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'USC Student Health Center可以打破伤风', '在USC的Student Health Center可以接种破伤风疫苗，如果不小心被生锈物划伤可以去咨询处理。');

-- thread 64cb3553 | 2024-08-24 | 18 msgs
insert into campus_knowledge (category, title, content) values ('study', 'USC图书馆自习推荐：Leavey & Philosophy Library', 'Leavey Library自习很方便；Philosophy Library也很推荐，就在Philosophy Building里，只有一层，环境好。');

-- thread ec91205b | 2024-08-27 | 18 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'CTCS190教室位置', 'CTCS190在Doheny（Dorsife楼区域）一楼，是个巨大电影院，不在二楼。来旁听的同学注意别走错楼层。');

-- thread 98730eac | 2024-08-28 | 18 msgs
insert into campus_knowledge (category, title, content) values ('food', 'Law School 三文鱼饭', 'USC Law School附近有卖三文鱼饭的地方，dining dollars可以用，lighter portion大概十刀出头。');

-- thread 504934f7 | 2024-09-07 | 18 msgs
insert into campus_knowledge (category, title, content) values ('food', 'Figs Corner 火锅评价', '学校附近有家叫Figs Corner的火锅，但肉比较少，菜豆皮居多，吃得不太爽');

-- thread eae9eca1 | 2024-10-13 | 18 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('USC有没有A- B+这回事呀，还是都是full letter grade？', '有的，有A- B+ B-这些grade，每门课都有。可以看下syllabus，上面都有写的。', 'academics', 'eae9eca1');

-- thread 769ccc69 | 2024-08-12 | 17 msgs
insert into campus_knowledge (category, title, content) values ('tips', '宿舍可以拉网线用千兆有线网', '小tips：宿舍可以自己拉网线，有线网络是千兆，比wifi稳定快很多。');
insert into campus_knowledge (category, title, content) values ('transport', 'USC校园内T-Mobile和AT&T信号都OK', 'USC校园内T-Mobile和AT&T信号基本没问题，走路上网偶尔会差一点，室内用校园wifi即可。T-Mobile在偏远地方信号据说也不错。');

-- thread ec37ba2d | 2024-08-15 | 17 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'HSC校区离主校园较远', 'HSC（Health Sciences Campus）在downtown另一边，离University Park Campus很远，去之前要规划好交通时间。');
insert into campus_knowledge (category, title, content) values ('transport', '校园外有共享电动滑板车', 'USC校园外面有共享scooter可以租用，适合短途出行。');

-- thread d60f46d8 | 2024-08-25 | 17 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'Lyon Center舞房', 'Lyon Center楼下有舞房，没有课的时候可以用，不用是舞蹈系的。进Lyon往楼下走，在F45旁边。');

-- thread 5fb07b1e | 2024-10-16 | 17 msgs
insert into campus_knowledge (category, title, content) values ('local', '下学期搬出宿舍需联系USC Housing', '想要下学期搬出USC宿舍，需要提前和USC Housing沟通办理手续。');

-- thread f3f8d24c | 2024-08-26 | 15 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'DMC楼位置查找', 'DMC (Dornsife Math Center) 206可以直接在Google Maps里搜索DMC找到，在Dornsife区域内。');
insert into campus_knowledge (category, title, content) values ('study', 'CTCS190教材', 'CTCS190需要准备教材：Bordwell, David and Kristin Thompson的《Film Art: An Introduction》');

-- thread ba1805d7 | 2024-09-19 | 15 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('上了大一之后还能转外校的学分吗？', 'Dornsife是可以的，我朋友夏天上的CC的GE课还能转学分。不过Marshall可能规定不一样，建议再问问advisor确认。', 'academics', 'ba1805d7');

-- thread 871200b9 | 2024-09-26 | 15 msgs
insert into campus_knowledge (category, title, content) values ('local', 'USC宿舍可以中途搬出', '宿舍是一学期交一次钱，想搬出去住校外不会被卡住，有朋友第二学期成功搬出去了。如果有人说不让出去是在吓唬你，可以先填release表格试试。');

-- thread cb44f813 | 2024-08-16 | 14 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'ITS Help Desk在Leavey Hall', 'USC的Information Technology Services (ITS) help desk应该在Leavey Hall里面，有Duo Security或账号问题可以去那边问。');

-- thread 9ca85f6e | 2024-08-17 | 14 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('我们TB testing过去后学校里可以做的话是怎么预约呀', '留意学校的邮件，会有一个叫immune fair还是啥，可以免费做', 'admin', '9ca85f6e');

-- thread 69cae2ab | 2024-08-29 | 14 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'USC Club Fair时间查询', 'USC club fair和club showcase的时间可以在Engage SC上查看，学校活动信息基本都发布在那里，虽然平台不太好用但是官方渠道');

-- thread b5c69389 | 2024-08-25 | 13 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'Parkside琴房需要住户帮忙check out', 'USC Parkside (PKS/AH) 有琴房，但如果你不住在那里，需要让住在PKS的同学帮你check out才能使用。');
insert into campus_knowledge (category, title, content) values ('study', '学校北边宗教社团聚集地有Yamaha钢琴', 'USC北边有个宗教社团聚集地，里面有一个大玻璃房，放着一架Yamaha钢琴，对外有一定开放性，但门有时候是锁的，碰运气。');

-- thread 0042b11d | 2024-08-29 | 13 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'Dining Dollars学年末清零', 'Dining Dollars好像是学年结束才清零，不是每学期，Spring semester结束还有余额');
insert into campus_knowledge (category, title, content) values ('food', 'Ronald Tutor旁边的Cafe可以用餐厅Swipe', 'Ronald Tutor Campus Center旁边的cafe可以使用一周两次的dining swipe');

-- thread 3494a7f8 | 2024-09-05 | 13 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('如果我有一个课，我上了一节我给drop了，我还能再选回来上吗？（如果中间我miss了一节课）', '包可以的啊，只是有点怪但是包可以的', 'academics', '3494a7f8');
insert into freshman_faq (question, answer, category, source_thread_id) values ('那如果在开课后add课呢，就如果错过了hw还有quiz，这个可以补吗', '可以问下professor', 'academics', '3494a7f8');

-- thread 28b5d0f8 | 2024-09-13 | 13 msgs
insert into campus_knowledge (category, title, content) values ('study', 'Annenberg学习区开放给其他学院学生', 'Annenberg的学习区其他学院学生也可以进去使用，环境好看，值得去体验。');

-- thread 97e699af | 2024-09-24 | 13 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('id丢了去哪补办啊，回不去宿舍了', '可以去 mycard.usc.edu 在线补办，或者线下办理，大概15分钟就能拿到新卡。也可以先办个guest卡临时用。', 'admin', '97e699af');

-- thread 815efd36 | 2024-09-24 | 13 msgs
insert into campus_knowledge (category, title, content) values ('food', '小紫+小白冰淇淋搭配推荐', '食堂有小紫和小白可以一起吃，配上炸面包类的食物和冰淇淋，据说贼好吃！');
insert into campus_knowledge (category, title, content) values ('food', '食堂可丽饼+冰淇淋', '食堂有可丽饼配冰淇淋和水果，最近有人确认还在供应，想吃可以去看看。');

-- thread 72af9606 | 2024-10-29 | 13 msgs
insert into campus_knowledge (category, title, content) values ('transport', '校车直达联合车站，不在Downtown中途停', 'USC校车不在Downtown中途停站，直接开到联合车站（Union Station）。第一次坐的同学注意，不要以为会在downtown下车。');

-- thread 50a0fcb7 | 2024-08-27 | 12 msgs
insert into course_tips (course_code, professor, tip, sentiment, source_thread_id) values ('CRIT 150', null, '艺术史课reading量极大，第一次上课前就要读三个paper共60多页，课上不能用电子设备，所有内容靠手写笔记，强度较高。', 'negative', '50a0fcb7');

-- thread 913bbf24 | 2024-08-28 | 12 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('我们meal plan可以把swipes全部都换成dinning dollars吗', '应该不可以，反过来ok', 'admin', '913bbf24');

-- thread da6a8913 | 2024-09-04 | 12 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'USC Bookstore有卖硬盘', 'USC bookstore可以买到硬盘，专业课需要硬盘的同学可以去看看。');
insert into campus_knowledge (category, title, content) values ('tips', '推荐硬盘品牌', '同学们推荐的硬盘品牌有：三星（Samsung T5）、LaCie、闪迪（SanDisk），其中三星T5口碑较好。');

-- thread 3d87b369 | 2024-08-08 | 11 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'TB检测预约流程', '肺结核(TB)检测不需要自己单独预约，学校会在orientation前发邮件通知，然后统一在Admission Center打疫苗做TB检测。');
insert into campus_knowledge (category, title, content) values ('tips', 'D-Clearance跟进建议', 'D-Clearance表格提交后如果长时间没有回复，建议主动多次催促advisor，这样办事效率会更高。');

-- thread 70f1535e | 2024-08-08 | 11 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('选的时候一定要lecture和lab一起选才能选上吗', '是的，lecture和lab要配套一起选。一般都是配好的，lecture跟lab的名额应该是一样的。如果出现没有配套lab选不上的情况，应该会再开一个lab session。', 'academics', '70f1535e');

-- thread 02046d5f | 2024-08-15 | 11 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'Dining Dollar 优惠小技巧', '可以找充多了dining dollars的学长学姐，以优惠价购买，但注意辨别真假和交易安全。');
insert into campus_knowledge (category, title, content) values ('tips', '寒假留校住宿申请', '寒假留校需要提前在housing portal申请住宿，食堂是否开放取决于假期安排。');

-- thread a141e85a | 2024-08-28 | 11 msgs
insert into campus_knowledge (category, title, content) values ('food', 'Law School Cafe vs JFF 三文鱼饭比较', 'Law school cafe的三文鱼饭据说比JFF更好吃，JFF版本反映偏咸。两家不是同一个配方。');
insert into campus_knowledge (category, title, content) values ('food', 'JFF包子不推荐', 'JFF的包子被评价像预制饭，口感一般，不建议点。');

-- thread 2ab061fe | 2024-09-15 | 11 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('有人申请成功公交卡吗？我在申请界面卡住了，点哪个选项都没反应，换浏览器也不行', 'google搜usc upass，上面有instruction。用电脑试试。实在不行可以去学校office，可以用他们的电脑在那里申请', 'admin', '2ab061fe');

-- thread 4b61a06e | 2024-10-01 | 11 msgs
insert into campus_knowledge (category, title, content) values ('transport', 'The Grove 看电影距离提醒', '从USC去The Grove看电影大概需要30分钟，周中想看电影的话距离比较远，要提前规划好时间。');

-- thread f876dc13 | 2024-08-01 | 10 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('校车bus的路线图在哪看，还有时间表之类的？', '可以去这个网站看：https://transnet.usc.edu/index.php/bus-map-schedules/ 里面有路线图和时间表。', 'general', 'f876dc13');

-- thread cdb86a45 | 2024-08-16 | 10 msgs
insert into campus_knowledge (category, title, content) values ('buildings', '宿舍信箱取信', '宿舍楼有信箱，银行卡等邮寄物品可以直接在宿舍信箱取，入住时前台会给你信箱钥匙。');
insert into campus_knowledge (category, title, content) values ('tips', 'Student ID Card领取', 'Student ID Card在靠近草坪那边的办公室领取，到达美国后去办理即可。');

-- thread 8832860e | 2024-08-19 | 10 msgs
insert into campus_knowledge (category, title, content) values ('tips', '宿舍外卖须知', '宿舍可以随时点外卖，但外卖员无法进入宿舍楼，需要自己出门到门口取餐。');

-- thread 5c6e9a7d | 2024-08-19 | 10 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('tb test是在哪里约呢？', '在邮箱里搜一个immune fest 的邮件，里面会有做这些的信息', 'admin', '5c6e9a7d');

-- thread be974a78 | 2024-08-22 | 10 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('work study和on campus啥的区别是什么呀', 'Work study 的学生是政府的一种financial aid program，是帮助他们找学习之余的part time来付学费的。on campus 就是平时没事干打零工。', 'academics', 'be974a78');

-- thread 46d1cc16 | 2024-09-02 | 10 msgs
insert into campus_knowledge (category, title, content) values ('local', 'USC附近理发店质量一般', 'USC附近理发店水平有限，想剪好看建议去Rowland Heights或Irvine，可以在小红书搜索靠谱推荐');

-- thread a5ba9748 | 2024-09-07 | 10 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('换专业应该和谁说', 'advisor', 'academics', 'a5ba9748');

-- thread 5d94010a | 2024-09-20 | 10 msgs
insert into campus_knowledge (category, title, content) values ('food', 'Law School附近Boba偏甜', 'Law school附近的boba据说比较甜，Village的boba甜度偏低，25% sugar都感觉没什么味道');

-- thread 2fd0fe2a | 2024-09-21 | 10 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'USC Bookstore早关门', 'USC Bookstore下午5点关门，需要购物要早去。');

-- thread be3ed846 | 2024-08-05 | 9 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'AlcoholEdu需要完成两次', 'AlcoholEdu视频看完还要重复一遍，而且明年同一时间还要再做一个module，是必须完成的。');

-- thread 8db36c11 | 2024-08-15 | 9 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'USC宿舍快递收货', '填宿舍地址的快递会送到宿舍楼前台，这一片的快递员都知道怎么给USC送快递，前台可以帮忙收货。');

-- thread 6a14b4a4 | 2024-08-21 | 9 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'Lyon健身房开放时间', 'Lyon健身房周中开放时间为早上7点到晚上11:30');
insert into campus_knowledge (category, title, content) values ('buildings', 'Village健身房开放时间', 'Village健身房目前中午后才开门，晚上9点关门');

-- thread 28877f4d | 2024-08-31 | 9 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('有人用支付宝成功交过学费吗？准备用支付宝付 但看到xhs上有人说不成功 不确定来问问', '可以的。如果不行的话也能退回的。', 'admin', '28877f4d');

-- thread c00c8c7b | 2024-09-09 | 9 msgs
insert into campus_knowledge (category, title, content) values ('local', 'Webb Tower异味问题', '有住户反映Webb Tower房间内出现类似腐烂的臭味，已有人向管理处report。如遇到同样问题建议及时submit maintenance request。');

-- thread 628d915f | 2024-10-27 | 9 msgs
insert into campus_knowledge (category, title, content) values ('transport', 'USC公交地铁Pass每学期需重申', 'USC的公交和地铁pass申到后只能用一个学期，下学期需要重新申请，否则会作废。');

-- thread 9338d928 | 2024-08-12 | 8 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('请问在哪里查自己的meal plan呀，meal plan的钱是不是和housing的一起交了？', '对的，meal plan的钱和housing一起交。如果没有做改变的话就是默认基础plan。可以在 https://hospitality.usc.edu/residential-dining-meal-plans/ 查看和修改。', 'housing', '9338d928');

-- thread 88841bd0 | 2024-08-23 | 8 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('咱学校只有一个bookstore吗', '是的，在二楼有一个巨无霸帽子，你上电梯看右手边的货架', 'general', '88841bd0');

-- thread 3b899d43 | 2024-08-28 | 8 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('请假writ150会发生什么吗', '看老师，次数太多可能不能走grading contract，具体看syllabus', 'academics', '3b899d43');

-- thread 83273770 | 2024-09-04 | 8 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'USC校园打印点', '图书馆可以打印；Art & Humanities楼有打印机；需先在USC Card Service网站账户充值，之后刷学生卡即可使用。');

-- thread df865f00 | 2024-09-06 | 8 msgs
insert into campus_knowledge (category, title, content) values ('transport', 'Royal停车楼有ChargePoint充电桩', 'USC校园内Royal停车楼（除Village外）设有ChargePoint电动车充电桩，但一层基本都被Tesla占满，充电位经常没有空位。');

-- thread 9f46ebf9 | 2024-10-25 | 8 msgs
insert into campus_knowledge (category, title, content) values ('transport', 'Game Day停车小技巧 (Doheny停车场)', '比赛日想在校内停车可以去Doheny停车场。避开有红色牌子的车位，车头朝内停，建议停到4楼，这样相对安全不容易被罚。');

-- thread c1617c9b | 2024-10-31 | 8 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('Trojan respect consent大概是干嘛的吗 可以只是在zoom里挂着什么都不干嘛', '可以取消然后再约其他的时间；然后发言就行', 'academics', 'c1617c9b');

-- thread 2eaab353 | 2024-08-07 | 7 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('我的ap分collegeboard说已经送到学校了，为什么成绩单里还是没有，这叫我怎么选课啊', '建议选到你喜欢的课，不然容易出事', 'academics', '2eaab353');

-- thread 5d773dc3 | 2024-08-07 | 7 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('想minor一个game design难不难，会不会不让', '不会的，要和advisor联系', 'academics', '5d773dc3');

-- thread 375801d1 | 2024-08-08 | 7 msgs
insert into campus_knowledge (category, title, content) values ('tips', '美国日常基本不需要现金', '在美国（包括USC周边）日常消费基本都可以用信用卡或Apple Pay tap支付，带少量现金（约20美元）放卡包里应急或付停车费即可。');

-- thread c8f696ef | 2024-08-19 | 7 msgs
insert into campus_knowledge (category, title, content) values ('local', '宿舍入住当天即可居住', 'Move-in当天预约即可入住，不需要等到第二天。需要提前在housing portal里预约check-in appointment。');

-- thread 09edf69e | 2024-08-19 | 7 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('flywire交学费手续费1500左右有点高，用易思汇缴费的话，资金安不安全？', '没用过易思汇，但用过支付宝，大概两三天就到账了。打开支付宝搜交学费就可以。', 'admin', '09edf69e');

-- thread 2f801c52 | 2024-08-21 | 7 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('我movein可以分两天吗？第二次还要预约吗？', '可以分两天。第一次预约只是为了拿钥匙，第二次不需要预约。', 'housing', '2f801c52');

-- thread 4772a2e0 | 2024-08-21 | 7 msgs
insert into campus_knowledge (category, title, content) values ('buildings', '宿舍门刷卡技巧', '刷卡开宿舍门时要非常缓慢地放进去再抽出来，不行多试几次。测试过最好的角度是头像在左上角放进去。');

-- thread c2073872 | 2024-08-22 | 7 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('打疫苗需要带什么？', '学生卡和手机就行了。', 'admin', 'c2073872');
insert into freshman_faq (question, answer, category, source_thread_id) values ('打疫苗之前要先上传已有的疫苗记录吗？', '是的，需要先上传。', 'admin', 'c2073872');

-- thread cd38eb5b | 2024-08-24 | 7 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('如果没买meal plan但想尝一下食堂的话可以单买嘛', '可以单买', 'food', 'cd38eb5b');

-- thread 8a153602 | 2024-08-27 | 7 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('如果教授一直没出现 可以直接溜吗', '劝别溜，建议你小心，还是乖乖呆着吧', 'academics', '8a153602');

-- thread 648a92a3 | 2024-08-29 | 7 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'USC Village健身房开门时间', 'USC Village的健身房早上7点开门，Google Map上显示的12点开门是错误的，信息未及时更新');

-- thread 4f093ebb | 2024-09-13 | 7 msgs
insert into campus_knowledge (category, title, content) values ('study', 'Philosophy Library 强烈推荐', 'Philosophy library被认为是USC最被低估的自习室之一，用户表示是「最近的最爱」，年少时没发现真的可惜');
insert into campus_knowledge (category, title, content) values ('study', 'Accounting Library值得一去', 'ACCT library也被推荐为不错的自习地点，建议同学们去check out一下');

-- thread af89d0b1 | 2024-10-14 | 7 msgs
insert into course_tips (course_code, professor, tip, sentiment, source_thread_id) values ('ART 110', null, 'Sketchbook writing assignment要求不清晰，学生反映看不懂题目要求', 'negative', 'af89d0b1');

-- thread 8aa3fb5c | 2024-10-23 | 7 msgs
insert into campus_knowledge (category, title, content) values ('tips', '校内Scooter停放有被盗风险', 'USC校园内scooter被盗案例时有发生，不要以为比自行车安全，已有同学反映在校内丢失scooter。');

-- thread 204497d1 | 2024-08-07 | 6 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('南加大有自己的校医院吗', '有，Keck，很厉害的，全美第28', 'general', '204497d1');

-- thread 3b5153f6 | 2024-08-14 | 6 msgs
insert into course_tips (course_code, professor, tip, sentiment, source_thread_id) values ('LING 110', null, '据说只要认真写作业，不去上课也能拿A', 'mixed', '3b5153f6');

-- thread fd9bba68 | 2024-08-24 | 6 msgs
insert into campus_knowledge (category, title, content) values ('transport', 'Uber可进入校园', 'Uber可以进入USC校园（去年确认可以，今年情况不确定，早上应该可以进）');

-- thread f7b5b43b | 2024-08-25 | 6 msgs
insert into campus_knowledge (category, title, content) values ('food', '喜茶位置', '喜茶在Marshall那边，不在Village。');

-- thread d1b83bf9 | 2024-08-31 | 6 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('是每学期只能pnp一门还是一学年一门啊', 'Undergrad 只有4个unit的ge能pnp，total 24个unit，4年一个ge', 'academics', 'd1b83bf9');

-- thread f910b8fa | 2024-09-06 | 6 msgs
insert into campus_knowledge (category, title, content) values ('buildings', 'Art & Humanities Building 快递取件', '快递会送到前台，取件时出示学生卡即可。');
insert into campus_knowledge (category, title, content) values ('tips', 'USC德州扑克社团', 'USC有一个扑克相关的club，名字好像叫Trojan Poker。');

-- thread 6492bb33 | 2024-08-05 | 5 msgs
insert into campus_knowledge (category, title, content) values ('local', 'USC宿舍床尺寸', 'USC所有宿舍（包括Webb）的床均为Twin XL尺寸，规格为96.5 cm x 203.5 cm。');

-- thread 497071b6 | 2024-08-22 | 5 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('USC有没有什么实用的app啊？就类似于那种官方的各种功能汇集到一起的', '没有这种app，但是myusc那个网站是', 'general', '497071b6');

-- thread 0392919e | 2024-08-25 | 5 msgs
insert into campus_knowledge (category, title, content) values ('buildings', '羽毛球场地', '校内打羽毛球可以去PED 210（PE楼），或者Lyon楼上也有场地，但要早点去占场。');

-- thread 21add378 | 2024-10-15 | 5 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('有itp249的朋友吗，brightspace找不着考试链接这正常吗', '是在gradescope上考！你看看email，应该把你加到gradescope里了，你点进去就好了', 'academics', '21add378');

-- thread a13e7ea3 | 2024-08-16 | 4 msgs
insert into campus_knowledge (category, title, content) values ('local', 'USC宿舍自带冰箱和微波炉', 'USC宿舍已自带小冰箱和微波炉，不需要额外购买。');

-- thread ba4abb51 | 2024-08-23 | 4 msgs
insert into freshman_faq (question, answer, category, source_thread_id) values ('请问如果选课显示不出来教授名字是什么情况呀...', 'either还没录入系统or还没分，比较倾向于第一个', 'academics', 'ba4abb51');

-- thread 4f4a133a | 2024-08-24 | 4 msgs
insert into campus_knowledge (category, title, content) values ('tips', 'Student Health需要提前预约', '去USC Student Health看病要先预约，在MyUSC ID里找Student Health的icon。没有位置的话要去校外的urgent care，会多收大概20-30美元。');

