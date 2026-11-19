/**
 * Year-by-Year Historical Earth Broadcast Chronicle (1926–2026, 101 Years)
 *
 * Every year from 1926 (100 ly wavefront in 2026) to 2026 (0 ly) contains 2–3
 * real historical television, radio, space-telemetry, radar, or METI broadcasts
 * in both English (`en`) and Czech (`cs`).
 *
 * Compact tuple schema:
 *   [type, titleEn, titleCs, detailEn, detailCs]
 *   where type ∈ 'tv' | 'radio' | 'space' | 'meti'
 */

const RAW_CHRONICLE_1926_1975 = {
  1926: [
    ['tv', 'John Logie Baird’s First Live TV Demonstration', 'První živá demonstrace televize J. L. Bairda', 'First public transmission of moving television images at the Royal Institution, London (Jan 1926).', 'První veřejný přenos pohyblivého televizního obrazu v Royal Institution v Londýně (leden 1926).'],
    ['radio', 'NBC Radio Network Launch & BBC Charter', 'Start rozhlasové sítě NBC a vznik BBC', 'First permanent coast-to-coast US radio network and establishment of the British Broadcasting Corporation.', 'První stálá celostátní rozhlasová síť v USA a založení britské korporace BBC.'],
    ['radio', 'Czechoslovak Radiojournal — First Live Football & Opera Relays', 'Radiojournal — první sportovní a operní přenosy v ČSR', 'Regular Prague/Brno/Bratislava broadcasts expand across Central Europe.', 'Pravidelné vysílání z Prahy, Brna a Bratislavy rozšiřuje pokrytí střední Evropy.'],
  ],
  1927: [
    ['tv', 'Philo Farnsworth’s First All-Electronic TV Image', 'První plně elektronický TV obraz Phila Farnswortha', 'First purely electronic television transmission using an image dissector tube in San Francisco.', 'První čistě elektronický televizní přenos pomocí obrazového disektoru v San Franciscu.'],
    ['radio', 'Lindbergh’s Transatlantic Arrival Broadcasts', 'Rozhlasové přenosy příletu Charlese Lindbergha', 'Live shortwave and network radio coverage of the Spirit of St. Louis landing in Paris and New York.', 'Živé krátkovlnné a síťové přenosy přistání letounu Spirit of St. Louis v Paříži a New Yorku.'],
    ['radio', 'CBS Radio Network Inaugural Broadcast', 'Zahájení vysílání rozhlasové sítě CBS', 'Columbia Phonographic Broadcasting System goes on the air across 16 US stations.', 'Spuštění vysílání sítě CBS na šestnácti amerických stanicích.'],
  ],
  1928: [
    ['tv', 'W2XB (WRGB) — First Scheduled TV Station & “The Queen’s Messenger”', 'První pravidelná TV stanice W2XB a hra „The Queen’s Messenger“', 'General Electric airs the world’s first television drama from Schenectady, New York.', 'General Electric odvysílala první televizní inscenaci světa ze Schenectady v New Yorku.'],
    ['radio', '“Amos ’n’ Andy” & Early Radio Serials', '„Amos ’n’ Andy“ a nástup rozhlasových seriálů', 'Syndicated evening radio comedy becomes America’s first mass national appointment broadcast.', 'Večerní rozhlasový seriál se stává prvním masovým národním pořadem v USA.'],
    ['tv', 'Baird’s First Transatlantic Television Signal', 'První transatlantický televizní signál J. L. Bairda', 'Shortwave experimental television image sent from Coulsdon, UK, to Hartsdale, New York.', 'Krátkovlnný experimentální TV signál přenesený z Velké Británie do státu New York.'],
  ],
  1929: [
    ['tv', 'BBC 30-Line Experimental Television Begins', 'BBC zahajuje 30řádkové experimentální TV vysílání', 'First BBC test transmissions using Baird’s mechanical system from Brookmans Park.', 'První zkušební televizní přenosy BBC Bairdovým systémem z vysílače Brookmans Park.'],
    ['radio', 'Wall Street Crash Breaking News Bulletins', 'Mimořádné rozhlasové zprávy o krachu na Wall Street', 'Continuous radio market bulletins report Black Tuesday across North America and Europe.', 'Nepřetržité zpravodajství o Černém úterý v rozhlasových sítích Ameriky i Evropy.'],
    ['radio', 'First Broadcasts from Antarctica (Byrd Expedition)', 'První rozhlasové přenosy z Antarktidy (Byrdova expedice)', 'Shortwave voice relays from Little America base reach worldwide listeners.', 'Krátkovlnné hlasové relace ze základny Little America zachycené posluchači po celém světě.'],
  ],
  1930: [
    ['radio', '“The Shadow” Radio Mystery Premiere', 'Premiéra rozhlasové detektivky „The Shadow“', 'Iconic mystery drama debuts on CBS Radio, spawning classic radio storytelling.', 'Ikonický mysteriózní pořad na CBS Radio odstartoval éru rozhlasových dramat.'],
    ['tv', 'BBC Airs “The Man with the Flower in His Mouth”', 'BBC vysílá první britskou TV hru', 'Pirandello’s one-act play becomes the first British television drama broadcast with synchronized sound.', 'Pirandellova jednoaktovka se stala první britskou TV inscenací se synchronním zvukem.'],
    ['radio', 'First FIFA World Cup Radio Coverage (Uruguay)', 'První rozhlasové přenosy z mistrovství světa ve fotbale', 'Live South American and shortwave relays cover the inaugural World Cup final in Montevideo.', 'Živé relace z premiérového finále mistrovství světa v Montevideu.'],
  ],
  1931: [
    ['radio', 'First Live Metropolitan Opera Saturday Broadcast', 'První živý sobotní přenos z Metropolitní opery', 'NBC begins the longest-running continuous classical broadcast series in radio history.', 'NBC zahájila nejdéle vysílanou sérii živých operních přenosů v dějinách.'],
    ['tv', 'W2XAB (CBS) & W2XBS (NBC) Experimental VHF TV', 'Experimentální VKV TV vysílání CBS a NBC v New Yorku', 'Early VHF television signals begin escaping Earth’s ionosphere from Manhattan transmitters.', 'První VKV televizní signály z Manhattanu začínají pronikat zemskou ionosférou.'],
    ['radio', 'Liblice High-Power Medium-Wave Transmitter (ČSR)', 'Spuštění velkovysílače Liblice v Československu', 'One of Europe’s strongest 120 kW radio transmitters goes live for Radiojournal.', 'Jeden z nejsilnějších 120kW rozhlasových vysílačů Evropy zahajuje provoz pro Radiojournal.'],
  ],
  1932: [
    ['radio', 'King George V’s First Royal Christmas Broadcast', 'První vánoční rozhlasový projev krále Jiřího V.', 'BBC Empire Service beams the monarch’s speech across global shortwave frequencies.', 'BBC Empire Service vysílá panovníkův projev na krátkých vlnách po celém světě.'],
    ['radio', '“The Jack Benny Program” Debuts on NBC', 'Premiéra „The Jack Benny Program“ na NBC', 'Landmark comedy series sets the template for modern sitcom timing and banter.', 'Přelomový komediální pořad určuje styl moderní rozhlasové i televizní komedie.'],
    ['space', 'Karl Jansky Detects Cosmic Radio Waves from Sagittarius', 'Karl Jansky zachycuje kosmické rádiové vlny ze Střelce', 'Bell Labs antenna discovers Milky Way radio emission, founding radio astronomy.', 'Anténa Bellových laboratoří objevuje rádiové záření Mléčné dráhy — zrod radioastronomie.'],
  ],
  1933: [
    ['radio', 'FDR’s First “Fireside Chat” Radio Address', 'První „hovor u krbu“ prezidenta F. D. Roosevelta', '60 million Americans listen to Roosevelt’s banking crisis address across national networks.', '60 milionů posluchačů sleduje Rooseveltův rozhlasový projev k bankovní krizi.'],
    ['radio', '“The Lone Ranger” Debuts on WXYZ Detroit', 'Premiéra westernového seriálu „The Lone Ranger“', 'Iconic Western adventure serial launches with Rossini’s William Tell Overture.', 'Slavný westernový seriál vstupuje do éteru za zvuků předehry k Vilému Tellovi.'],
    ['tv', 'Vladimir Zworykin Demonstrates the Iconoscope', 'Vladimir Zworykin předvádí ikonoskop', 'First practical all-electronic TV camera tube paves the way for high-definition VHF broadcasts.', 'První praktická elektronická snímací elektronka otevírá cestu VKV televizi.'],
  ],
  1934: [
    ['radio', '“Lux Radio Theatre” Premiere on NBC Blue', 'Premiéra „Lux Radio Theatre“ na NBC', 'Hollywood stars perform hour-long live radio adaptations of major motion pictures.', 'Hollywoodské hvězdy živě hrají hodinové rozhlasové adaptace filmových hitů.'],
    ['radio', 'BBC & European Long-Wave Lucerne Frequency Plan', 'Lucernský frekvenční plán evropského rozhlasu', 'Standardized European broadcast bands boost high-power continental transmissions.', 'Mezinárodní rozdělení kmitočtů přináší silnější celoevropské vysílání.'],
  ],
  1935: [
    ['tv', 'Fernsehsender “Paul Nipkow” (Berlin) — World’s First Regular TV Service', 'Televizní stanice Paul Nipkow (Berlín) — první pravidelná TV', 'High-power 44.3 MHz VHF television transmitter broadcasts scheduled programs from Berlin.', 'Vysokovýkonný 44,3 MHz VKV televizní vysílač zahajuje pravidelný program v Berlíně.'],
    ['space', 'Robert Watson-Watt’s Daventry Radar Experiment', 'Daventryjský radarový experiment R. Watsona-Watta', 'First practical aircraft detection using 49-meter BBC shortwave transmissions in Britain.', 'První úspěšná detekce letadla odrazem krátkovlnného signálu BBC v Británii.'],
    ['radio', '“Your Hit Parade” Launches on NBC Radio', 'Start hudební hitparády „Your Hit Parade“', 'Weekly nationwide countdown of popular songs airs across US networks.', 'Týdenní celostátní hudební žebříček populárních skladeb na síti NBC.'],
  ],
  1936: [
    ['tv', '1936 Berlin Olympic Games — First High-Power VHF TV Broadcast', 'Olympijské hry Berlín 1936 — první silný VKV TV přenos', 'Iconic VHF television signal strong enough to punch cleanly through the ionosphere (featured in Carl Sagan’s Contact).', 'První silný VKV televizní signál pronikající čistě ionosférou (proslavený v Saganově Kontaktu).'],
    ['tv', 'BBC Television Launches Regular High-Definition Service (405-Line)', 'BBC spouští pravidelné 405řádkové VKV TV vysílání', 'Alexandra Palace transmitter in London begins daily 45 MHz VHF television broadcasts.', 'Vysílač Alexandra Palace v Londýně zahajuje denní 45 MHz VKV televizní vysílání.'],
    ['radio', 'Czechoslovak Shortwave Station Poděbrady Launches', 'Zahájení krátkovlnného vysílání z Poděbrad do zahraničí', 'Radio Prague begins international shortwave broadcasts in Czech, English, French, and German.', 'Radio Praha spouští mezinárodní krátkovlnné vysílání v češtině a světových jazycích.'],
  ],
  1937: [
    ['radio', 'Hindenburg Disaster — Herbert Morrison’s Live Eyewitness Report', 'Katastrofa vzducholodi Hindenburg — reportáž H. Morrisona', 'Dramatic eyewitness broadcast from Lakehurst, NJ, aired nationwide on NBC.', 'Dramatická očitá reportáž z Lakehurstu odvysílaná celostátní sítí NBC.'],
    ['tv', 'BBC’s First Live Outside Broadcast — Coronation of King George VI', 'První venkovní přenos BBC — korunovace Jiřího VI.', 'Mobile television vans beam the royal procession live over London VHF waves.', 'Přenosové vozy BBC živě vysílají královský průvod na londýnských VKV vlnách.'],
    ['tv', 'First Televised Wimbledon Tennis Championships', 'První televizní přenos z Wimbledonu', 'BBC transmits 25 minutes of live Centre Court tennis matches via VHF.', 'BBC vysílá první přímé televizní záběry z centrálního dvorce ve Wimbledonu.'],
  ],
  1938: [
    ['radio', 'Orson Welles — “The War of the Worlds” (CBS Radio)', 'Orson Welles — „Válka světů“ (CBS Radio)', 'Mercury Theatre’s legendary Halloween Martian-invasion radio broadcast.', 'Legendární halloweenská rozhlasová hra o invazi Marťanů z dílny Mercury Theatre.'],
    ['radio', 'Munich Crisis Live Transatlantic Radio Reports', 'Živé rozhlasové reportáže z Mnichovské krize', 'CBS World News Roundup pioneers live multi-capital European news relays (Edward R. Murrow, William Shirer).', 'CBS poprvé živě spojuje zpravodaje z evropských metropolí včetně Prahy.'],
    ['tv', 'BBC Airs First Sci-Fi Television Adaptation: Karel Čapek’s “R.U.R.”', 'První sci-fi TV inscenace světa: Čapkovo „R.U.R.“ na BBC', 'A 35-minute live broadcast of Czech author Karel Čapek’s robot play beams out from Alexandra Palace!', '35minutová živá adaptace hry Karla Čapka o robotech letí na VKV z Alexandra Palace do vesmíru!'],
  ],
  1939: [
    ['tv', 'NBC Launches Regular US Television at the New York World’s Fair', 'NBC zahajuje pravidelnou TV na Světové výstavě v New Yorku', 'President Roosevelt’s opening speech becomes the first televised US presidential broadcast (Empire State Building VHF).', 'Projev prezidenta Roosevelta vysílaný z Empire State Building otevírá éru americké televize.'],
    ['radio', 'Neville Chamberlain’s Declaration of War Broadcast (BBC)', 'Rozhlasové vyhlášení války N. Chamberlaina (BBC)', 'Historic September 3 radio address announces the outbreak of World War II in Europe.', 'Historický projev 3. září oznamuje v britském éteru vypuknutí 2. světové války.'],
    ['space', 'Chain Home Coastal Early-Warning Radar Network Goes Operational', 'Spuštění britské pobřežní radarové sítě Chain Home', 'High-power 20–50 MHz military radar pulses begin radiating strongly into space.', 'Vysokovýkonné vojenské radary 20–50 MHz začínají vysílat silné pulsy do vesmíru.'],
  ],
  1940: [
    ['radio', 'Edward R. Murrow — “This Is London” Blitz Broadcasts', 'Edward R. Murrow — reportáže „Tady Londýn“ z náletů', 'Live rooftop broadcasts from London during the Battle of Britain air raids.', 'Živé rozhlasové vstupy ze střech Londýna během bitvy o Británii.'],
    ['space', 'Wartime Megawatt Coastal & Air-Defense Radars Peak', 'Válečné megawattové radary PVO napříč Evropou', 'Chain Home, Freya, and Würzburg radars emit vastly stronger radio leakage than civilian broadcasts.', 'Radary Chain Home, Freya a Würzburg vyzařují do vesmíru řádově silnější pulsy než civilní rozhlas.'],
    ['radio', 'BBC Czech Service (“Volá Londýn”) Begins Wartime Broadcasts', 'Československé vysílání BBC „Volá Londýn“', 'Jan Masaryk and exiled journalists broadcast daily shortwave programs to occupied Czechoslovakia.', 'Jan Masaryk a exiloví novináři vysílají denní krátkovlnné relace do okupovaného Československa.'],
  ],
  1941: [
    ['tv', 'First Commercial TV License (WNBT / Bulova Watch Ad)', 'První komerční TV licence a první televizní reklama (WNBT)', 'FCC authorizes commercial 525-line VHF television; 10-second Bulova clock airs before a Dodgers game.', 'FCC schvaluje komerční 525řádkovou VKV televizi; před baseballovým zápasem běží první TV reklama.'],
    ['radio', 'Pearl Harbor Flash Bulletins & FDR’s “Day of Infamy” Speech', 'Mimořádné zprávy o Pearl Harboru a projev F. D. Roosevelta', 'Largest US radio audience in history hears Congress declare war on December 8.', 'Největší rozhlasové publikum v historii USA sleduje prohlášení války po útoku na Pearl Harbor.'],
    ['radio', 'First Commercial FM Radio Station (W47NV Nashville)', 'První komerční VKV FM rozhlasová stanice (W47NV)', 'Frequency-modulated VHF audio signals begin escaping Earth’s ionosphere with minimal static.', 'Frekvenčně modulovaný VKV rozhlas proniká ionosférou čistěji než střední vlny.'],
  ],
  1942: [
    ['radio', 'Voice of America Inaugural Shortwave Broadcast', 'Zahájení krátkovlnného vysílání Hlasu Ameriky (VOA)', 'First multi-language broadcasts air from New York to Europe and Asia.', 'První vícejazyčné krátkovlnné relace z New Yorku směrem do Evropy a Asie.'],
    ['space', 'James Hey Discovers Solar Radio Bursts on British Radar', 'James Hey objevuje sluneční rádiové erupce na britských radarech', 'Anti-aircraft VHF radars accidentally record intense radio waves from a giant sunspot.', 'Protiletadlové VKV radary zachycují mohutné rádiové záření ze sluneční skvrny.'],
    ['radio', '“Command Performance” Armed Forces Radio Variety', 'Vojenské rozhlasové vysílání Armed Forces Radio', 'Global shortwave entertainment network links Allied troops across every continent.', 'Globální krátkovlnná síť spojuje spojenecké jednotky na všech kontinentech.'],
  ],
  1943: [
    ['space', 'H2S Airborne Cavity-Magnetron Centimeter Radar Deployed', 'Nasazení centimetrových magnetronových radarů H2S', 'High-power microwave pulses (3–10 GHz) pass effortlessly through Earth’s ionosphere into deep space.', 'Mikrovlnné pulsy (3–10 GHz) procházejí zemskou ionosférou prakticky bez útlumu do vesmíru.'],
    ['radio', '“The Shadow” & Wartime Mystery/News Radio Peak', 'Vrchol válečného rozhlasového zpravodajství a her', 'Allied shortwave and domestic networks operate 24/7 across Europe, North America, and the Pacific.', 'Spojenecké rozhlasové sítě vysílají nepřetržitě v Evropě, Americe i Pacifiku.'],
  ],
  1944: [
    ['radio', 'D-Day Normandy Invasion Live Radio Dispatches', 'Živé rozhlasové reportáže z vylodění v Normandii (Den D)', 'George Hicks records live naval gunfire and air raids aboard USS Ancon off Omaha Beach.', 'Autentické nahrávky spojeneckého vylodění a protiletadlové palby vysílané po celém světě.'],
    ['radio', 'BBC General Forces Programme & Glenn Miller Broadcasts', 'BBC pro spojenecká vojska a koncerty Glenna Millera', 'Swing music and frontline news beam across Western Europe ahead of liberation.', 'Swingová hudba a frontové zpravodajství napříč západní Evropou.'],
  ],
  1945: [
    ['radio', 'V-E Day, Prague Uprising Radio Call & V-J Day Broadcasts', 'Konec 2. sv. války a vysílání pražského rozhlasu (květen 1945)', 'Historic calls from Vinohradská 12 in Prague and global broadcasts celebrating the end of WWII.', 'Historické volání pražského rozhlasu „Voláme všechny Čechy!“ a celosvětové oslavy konce války.'],
    ['radio', 'Arthur C. Clarke Publishes Geostationary Satellite Communications Paper', 'Arthur C. Clarke publikuje koncept geostacionárních družic', 'Wireless World article outlines global orbital radio relays — the blueprint for modern satcom.', 'Článek v časopisu Wireless World navrhuje družicové přenosy, základ moderní kosmické komunikace.'],
    ['tv', 'Post-War US VHF Television Resumes Commercial Expansion', 'Poválečný restart komerční VKV televize v USA', 'New York, Philadelphia, and Chicago transmitters resume full evening schedules.', 'Televizní vysílače v New Yorku, Filadelfii a Chicagu obnovují plný večerní program.'],
  ],
  1946: [
    ['space', 'Project Diana — First Radar Signal Bounced Off the Moon', 'Projekt Diana — první radarový odraz signálu od Měsíce', 'US Army Signal Corps beams 111.5 MHz pulses to the Moon and receives the echo 2.5 seconds later!', 'Americký radar vysílá 111,5 MHz impulsy k Měsíci a po 2,5 s zachycuje odraz — zrod radarové astronomie!'],
    ['tv', 'BBC Television Resumes After WWII (“As I Was Saying...”)', 'BBC obnovuje poválečné televizní vysílání', 'Jasmine Bligh greets viewers from Alexandra Palace as post-war VHF TV restarts in Britain.', 'Po sedmileté válečné pauze se znovu rozbíhá pravidelné VKV vysílání BBC z Alexandra Palace.'],
    ['tv', 'First Televised Heavyweight Title Fight (Joe Louis vs. Billy Conn)', 'První televizní přenos zápasu o titul mistra světa v boxu', 'NBC airs live coaxial-linked championship boxing across the US East Coast.', 'NBC přenáší živě boxerský duel přes novou koaxiální síť na východním pobřeží USA.'],
  ],
  1947: [
    ['tv', '“Meet the Press” & “Howdy Doody” Premiere on NBC', 'Premiéra „Meet the Press“ a „Howdy Doody“ na NBC', 'The longest-running US television news program and first hit children’s TV show take the air.', 'Nejdéle vysílaný americký diskusní pořad i první dětský televizní hit míří do éteru.'],
    ['tv', 'First Televised World Series (Yankees vs. Dodgers)', 'První televizní přenos baseballové Světové série', 'Nearly 4 million viewers crowd homes and taverns to watch VHF baseball broadcasts.', 'Téměř 4 miliony diváků sledují první přímý televizní přenos Světové série.'],
    ['radio', 'Chuck Yeager Breaks the Sound Barrier (Bell X-1 Telemetry)', 'Chuck Yeager překonává rychlost zvuku (telemetrie Bell X-1)', 'VHF flight-test telemetry records the first controlled supersonic flight over Muroc Dry Lake.', 'VKV letová telemetrie zaznamenává první řízený nadzvukový let člověka.'],
  ],
  1948: [
    ['tv', '“Toast of the Town” (Ed Sullivan Show) & “Texaco Star Theater”', 'Start „Ed Sullivan Show“ a „Texaco Star Theater“', 'Milton Berle and Ed Sullivan turn television into a nationwide American evening ritual.', 'Milton Berle a Ed Sullivan mění televizi v masový večerní rituál po celých USA.'],
    ['tv', 'BBC Covers the 1948 London Olympic Games Live', 'BBC vysílá přímé TV přenosy z olympiády v Londýně 1948', 'Over 64 hours of live VHF Olympic broadcasts radiate outward from London.', 'Přes 64 hodin živých VKV olympijských přenosů z Londýna uniká do vesmíru.'],
    ['tv', 'First Experimental Television Broadcast in Czechoslovakia (Tanvald)', 'První pokusné televizní vysílání v Československu (Tanvald)', 'Military Technical Institute demonstrates live 625-line Czech television at MEVRO exhibition.', 'Vojenský technický ústav předvádí na výstavě MEVRO první živé 625řádkové TV vysílání v ČSR.'],
  ],
  1949: [
    ['tv', '“Captain Video and His Video Rangers” — First TV Sci-Fi Series', '„Captain Video“ — první sci-fi televizní seriál', 'Live space-adventure serial broadcasts five nights a week across the DuMont network.', 'Živý vesmírný sci-fi seriál vysílaný pět večerů v týdnu v síti DuMont.'],
    ['tv', 'First Emmy Awards Televised (Los Angeles)', 'První televizní přenos udílení cen Emmy', 'KTSL Los Angeles airs the inaugural Academy of Television Arts & Sciences ceremony.', 'Stanice KTSL v Los Angeles vysílá první slavnostní ceremoniál cen Emmy.'],
    ['radio', 'Czechoslovak Radio Symphony & International Shortwave Expansion', 'Rozmach poválečného rozhlasu v Evropě', 'Post-war VHF FM broadcasting expands rapidly across Germany, UK, and Central Europe.', 'Poválečný VKV FM rozhlas se rychle rozšiřuje napříč západní i střední Evropou.'],
  ],
  1950: [
    ['tv', '“Your Show of Shows” & “What’s My Line?” Premiere', 'Premiéra „Your Show of Shows“ a „What’s My Line?“', 'Live 90-minute comedy variety with Sid Caesar and CBS’s hit game show define early 1950s TV.', 'Živá 90minutová komediální show Sida Caesara a soutěž CBS definují raná 50. léta.'],
    ['tv', 'First Cross-Channel Live TV Broadcast (Calais → London)', 'První živý TV přenos přes Lamanšský průliv (Calais → Londýn)', 'BBC beams live video from France across microwave relays to British homes.', 'BBC poprvé přenáší živý televizní obraz z Francie přes mikrovlnné spoje do Británie.'],
    ['tv', 'First Commercial Color TV Broadcast Tests (CBS)', 'První pokusné vysílání barevné televize (CBS)', 'Early experimental color transmissions begin in the United States.', 'První komerční testy barevné televize ve Spojených státech.'],
  ],
  1951: [
    ['tv', '“I Love Lucy” Premieres on CBS', 'Premiéra legendárního sitcomu „I Love Lucy“ na CBS', 'Lucille Ball and Desi Arnaz pioneer the three-camera sitcom watched by 60%+ of US TV homes.', 'Lucille Ball a Desi Arnaz zavádějí tříkamerový sitcom sledovaný přes 60 % amerických domácností.'],
    ['tv', 'First Coast-to-Coast US Live Television Broadcast', 'První živý televizní přenos napříč celými USA', 'President Truman’s San Francisco Peace Treaty address links Atlantic and Pacific VHF towers.', 'Projev prezidenta Trumana ze San Francisca propojuje VKV vysílače obou pobřeží USA.'],
    ['space', '21-cm Hydrogen Line Detected by Ewen & Purcell', 'Objev 21cm vodíkové čáry (Ewen & Purcell)', 'Discovery of the 1420 MHz neutral hydrogen emission — later the prime frequency of SETI.', 'Objev emise neutrálního vodíku na 1420 MHz — pozdější hlavní frekvence pro hledání SETI.'],
  ],
  1952: [
    ['tv', '“Today” Show & “American Bandstand” Launch', 'Premiéra ranní show „Today“ a „American Bandstand“', 'NBC invents morning television while Philadelphia launches youth music TV.', 'NBC zakládá ranní televizní magazíny a Filadelfie spouští hudební pořady pro mládež.'],
    ['tv', 'First Televised US Presidential Conventions (Eisenhower vs. Stevenson)', 'První celostátní TV přenosy prezidentských sjezdů v USA', 'Network news anchors Walter Cronkite and Chet Huntley become household names.', 'Televizní zpravodajství Walterem Cronkitem mění americkou politickou kulturu.'],
    ['tv', 'Japan (NHK) & Canada (CBC) Launch National Television', 'Japonsko (NHK) a Kanada (CBC) zahajují národní TV vysílání', 'VHF television footprints expand rapidly across the Northern Hemisphere.', 'VKV televizní vysílače pokrývají další kontinenty severní polokoule.'],
  ],
  1953: [
    ['tv', 'Czechoslovak Television (ČST) First Broadcast from Prague (May 1)', 'Zahájení vysílání Československé televize (ČST) z Prahy (1. května)', 'Studio Měšťanská beseda and Petřín Tower launch live Czech VHF television!', 'Studio v Měšťanské besedě a rozhledna Petřín zahajují živé VKV vysílání ČST!'],
    ['tv', 'Coronation of Queen Elizabeth II', 'Korunovace královny Alžběty II. v přímém přenosu', 'First major international live TV event watched by 27 million viewers across Britain and Europe.', 'První velká mezinárodní TV událost sledovaná 27 miliony diváků v Británii a Evropě.'],
    ['tv', '“The Quatermass Experiment” (BBC) & NTSC Color Standard Adopted', 'Sci-fi seriál „The Quatermass Experiment“ (BBC) a standard NTSC', 'Landmark British sci-fi television serial airs live as the US approves compatible color TV.', 'Přelomová britská sci-fi minisérie vysílaná živě; v USA schválen barevný standard NTSC.'],
  ],
  1954: [
    ['tv', 'Eurovision Network Launches Live Across Eight European Nations', 'Start evropské televizní sítě Eurovize v 8 zemích', 'First pan-European live relay from Montreux and the 1954 FIFA World Cup in Switzerland.', 'První celoevropský přímý přenos ze Švýcarska včetně mistrovství světa ve fotbale.'],
    ['tv', '“The Tonight Show” & “Disneyland” Premiere', 'Premiéra „The Tonight Show“ a pořadu „Disneyland“', 'Late-night talk television and Walt Disney’s weekly anthology hit US VHF airwaves.', 'Vznik noční talk show na NBC a týdenního rodinného magazínu Walta Disneyho.'],
    ['tv', 'ČST Begins Regular Scheduled Broadcasts Across Bohemia', 'ČST přechází na pravidelné vysílání v Československu', 'Prague television transitions from experimental tests to permanent regular programming.', 'Československá televize přechází z pokusného provozu na pravidelný program.'],
  ],
  1955: [
    ['tv', '“Gunsmoke”, “Alfred Hitchcock Presents” & “The Honeymooners”', 'Premiéra „Gunsmoke“, „Alfred Hitchcock uvádí“ a „The Honeymooners“', 'Classic American drama, suspense, and sitcom staples beam from hundreds of VHF towers.', 'Klasické americké drama, napětí a sitcomy vysílané ze stovek VKV vysílačů.'],
    ['tv', 'ITV Launches Commercial Television in the UK', 'Spuštění komerční televize ITV ve Velké Británii', 'Britain’s second VHF channel breaks the BBC monopoly with live variety and drama.', 'Druhý britský VKV kanál ITV ukončuje monopol BBC.'],
    ['tv', 'ČST Broadcasts First Live Ice Hockey Match from Štvanice, Prague', 'První živý hokejový TV přenos ČST z pražské Štvanice', 'Iconic Czechoslovak sports broadcast marks the dawn of Central European live sports TV.', 'Historický sportovní přenos ze stadionu Štvanice startuje tradici českých hokejových přenosů.'],
  ],
  1956: [
    ['tv', 'First Eurovision Song Contest (Lugano) & Elvis on Ed Sullivan', 'První ročník Eurovize (Lugano) a Elvis Presley v Ed Sullivan Show', '60 million viewers watch Elvis perform live — 82.6% of all US television households.', '60 milionů diváků (82,6 % amerických TV) sleduje živé vystoupení Elvise Presleyho.'],
    ['tv', 'Ampex Demonstrates First Practical Videotape Recorder (VRX-1000)', 'Ampex předvádí první praktický videorekordér', 'Broadcast television gains time-shifted recording for news and prime-time shows.', 'Televize získává magnetický záznam obrazu pro zpravodajství a večerní pořady.'],
    ['tv', 'ČST Expands with Bratislava & Ostrava Television Studios', 'ČST rozšiřuje vysílání o studia v Bratislavě a Ostravě', 'High-power regional VHF transmitters bring television across all of Czechoslovakia.', 'Silné krajské VKV vysílače pokrývají celé území Československa.'],
  ],
  1957: [
    ['space', 'Sputnik 1 Orbital Radio Beacons (20.005 & 40.002 MHz)', 'Rádiové signály Sputniku 1 z oběžné dráhy (20 a 40 MHz)', 'Humanity’s first artificial satellite beams unmistakable “beep-beep-beep” pulses directly from orbit!', 'První umělá družice Země vysílá nezaměnitelné „píp-píp“ přímo z oběžné dráhy do celého vesmíru!'],
    ['tv', '“Leave It to Beaver”, “Perry Mason” & “The Sky at Night” (BBC)', 'Premiéra „Perry Mason“ a astronomického pořadu „The Sky at Night“', 'Patrick Moore launches the world’s longest-running astronomy TV series on BBC.', 'Patrick Moore zahajuje na BBC nejdéle vysílaný televizní pořad o astronomii na světě.'],
    ['space', 'Jodrell Bank 76 m Lovell Radio Telescope Begins Operations', 'Spuštění 76m radioteleskopu Jodrell Bank', 'Giant steerable dish tracks Sputnik’s carrier rocket and opens deep-space radio tracking.', 'Obří parabolická anténa sleduje nosnou raketu Sputniku a startuje éru kosmického sledování.'],
  ],
  1958: [
    ['space', 'Explorer 1 & Score Satellite — First Human Voice Broadcast from Space', 'Explorer 1 a družice SCORE — první lidský hlas z vesmíru', 'President Eisenhower’s Christmas peace message beams down from orbit via Project SCORE.', 'Vánoční mírové poselství prezidenta Eisenhowera z družice SCORE — první hlas vyslaný z orbity.'],
    ['tv', '“Blue Peter” (BBC) & “Peter Gunn” Premiere', 'Premiéra „Blue Peter“ (BBC) a „Peter Gunn“', 'Classic children’s television and Henry Mancini’s iconic noir jazz score hit the airwaves.', 'Klasický britský magazín pro mládež a slavná jazzová znělka Henryho Manciniho.'],
    ['space', 'DEW Line & Early Ballistic-Missile Radars Activate Across the Arctic', 'Aktivace arktických včasných radarů DEW Line a BMEWS', 'Megawatt UHF surveillance radars become Earth’s brightest narrow-beam radio signature.', 'Megawattové UHF radary se stávají nejjasnějším rádiovým majákem planety Země.'],
  ],
  1959: [
    ['tv', '“The Twilight Zone” & “Bonanza” Premiere', 'Premiéra „Zóny soumraku“ (The Twilight Zone) a „Bonanzy“', 'Rod Serling’s visionary sci-fi anthology and NBC’s first all-color Western hit prime time.', 'Vizionářská sci-fi antologie Roda Serlinga a první plně barevný western na NBC.'],
    ['space', 'Luna 3 Transmits First Photos of the Far Side of the Moon', 'Sonda Luna 3 vysílá první snímky odvrácené strany Měsíce', 'Soviet deep-space radio fax reveals Mare Moscoviense and Tsiolkovskiy crater to humanity.', 'Sovětská sonda přenáší rádiovým signálem první záběry odvrácené polokoule Měsíce.'],
    ['space', 'Cocconi & Morrison Publish Foundational SETI Paper in Nature', 'Cocconi a Morrison publikují v Nature zakládající práci SETI', '“Searching for Interstellar Communications” proposes scanning 1420 MHz for alien beacons.', 'Článek navrhuje pátrat po mezihvězdných rádiových signálech na kmitočtu 1420 MHz.'],
  ],
  1960: [
    ['space', 'Project Ozma — Frank Drake’s First SETI Search (Tau Ceti & Eps Eri)', 'Projekt Ozma — první pátrání SETI (Tau Ceti a Epsilon Eridani)', 'Green Bank 26 m dish listens at 1420 MHz for artificial signals from two nearby Sun-like stars.', 'Radioteleskop Green Bank poprvé cíleně naslouchá dvěma blízkým hvězdám podobným Slunci.'],
    ['tv', '“The Flintstones”, “Coronation Street” & Kennedy–Nixon TV Debates', 'Premiéra „Flintstoneových“, „Coronation Street“ a debaty Kennedy–Nixon', '70 million watch the first televised US presidential debates while prime-time animation debuts.', '70 milionů diváků sleduje první televizní prezidentské debaty; startují Flintstoneovi.'],
    ['space', 'TIROS-1 Weather Satellite & Echo 1 Passive Radio Reflector', 'Meteorologická družice TIROS-1 a balonová družice Echo 1', 'First live television weather views of Earth from space and first orbital voice bounce.', 'První televizní pohledy na oblačnost Země z vesmíru a první odraz hlasu od družice Echo 1.'],
  ],
  1961: [
    ['space', 'Yuri Gagarin’s “Poyekhali!” — First Human Orbital Radio Link (Vostok 1)', 'Jurij Gagarin „Pojechali!“ — první hlas člověka z oběžné dráhy', 'VHF voice and telemetry transmissions from the first crewed spaceflight (143.625 MHz).', 'VKV hlasové spojení a telemetrie prvního kosmického letu člověka (Vostok 1, 143,625 MHz).'],
    ['tv', '“The Avengers” (UK) & Alan Shepard’s Freedom 7 Live TV Coverage', 'Premiéra „The Avengers“ a přímý TV přenos letu Alana Sheparda', '45 million Americans watch live VHF coverage of Mercury-Redstone 3 launch.', '45 milionů Američanů sleduje živý televizní přenos prvního amerického kosmického letu.'],
    ['radio', 'Czechoslovak Intervision Live Relays Join Eastern & Western Europe', 'Propojení sítě Intervize s Eurovizí pro přímé kosmické přenosy', 'Gagarin’s Moscow welcome is beamed live across both Intervision and Eurovision networks.', 'Přivítání Jurije Gagarina v Moskvě letí živě přes propojené sítě Intervize a Eurovize.'],
  ],
  1962: [
    ['space', 'Telstar 1 — First Live Transatlantic Satellite Television Relay', 'Telstar 1 — první živý transatlantický družicový TV přenos', 'Live microwave TV links Andover, Maine, to Pleumeur-Bodou, France, and Goonhilly, UK.', 'První přímý televizní přenos přes aktivní telekomunikační družici mezi USA a Evropou.'],
    ['meti', 'The Morse Message (Yevpatoria Radar → Venus)', 'Morseova zpráva z Jevpatorije k Venuši (první METI test)', 'Soviet planetary radar beams “MIR / LENIN / SSSR” toward Venus and onward toward Libra.', 'Sovětský planetární radar vysílá slova „MIR / LENIN / SSSR“ k Venuši a dál do vesmíru.'],
    ['tv', '“The Tonight Show Starring Johnny Carson” & “The Jetsons” Premiere', 'Premiéra „The Jetsons“ a Johnnyho Carsona v Tonight Show', 'Space-age animated futurism and late-night comedy sweep American VHF broadcasts.', 'Vesmírný animovaný futurismus a noční talk show ovládají americké VKV vysílání.'],
  ],
  1963: [
    ['tv', '“Doctor Who” Premieres on BBC (“An Unearthly Child”)', 'Premiéra sci-fi fenoménu „Doctor Who“ na BBC', 'The TARDIS departs on November 23 — the longest-running sci-fi TV series in history.', 'TARDIS startuje 23. listopadu — nejdéle vysílaný sci-fi seriál v dějinách televize.'],
    ['tv', 'JFK Assassination — Four Days of Continuous Live Global Television', 'Atentát na J. F. Kennedyho — 4 dny nepřetržitého globálního vysílání', 'Satellite relays via Relay 1 carry live coverage simultaneously to North America, Europe, and Japan.', 'Družicové přenosy poprvé spojují Severní Ameriku, Evropu i Japonsko v reálném čase.'],
    ['space', 'Arecibo 305 m Radio Telescope Inaugurated in Puerto Rico', 'Otevření 305m radioteleskopu Arecibo v Portoriku', 'World’s most powerful planetary radar begins beaming megawatt S-band signals into the cosmos.', 'Nejvýkonnější planetární radar světa zahajuje vysílání megawattových paprsků do vesmíru.'],
  ],
  1964: [
    ['tv', 'The Beatles on “The Ed Sullivan Show” (73 Million Viewers)', 'The Beatles v „The Ed Sullivan Show“ (73 milionů diváků)', 'One of the highest-rated VHF music broadcasts in television history radiates into space.', 'Jeden z nejsledovanějších hudebních TV přenosů dějin se šíří VKV éterem ke hvězdám.'],
    ['tv', '1964 Tokyo Olympic Games — First Geostationary Satellite Live TV (Syncom 3)', 'Olympiáda Tokio 1964 — první přenos přes geostacionární družici', 'Trans-Pacific live coverage via Syncom 3 brings the Tokyo Games to global television.', 'Geostacionární družice Syncom 3 poprvé živě přenáší olympijské hry přes Pacifik.'],
    ['space', 'Penzias & Wilson Discover the Cosmic Microwave Background (CMB)', 'Penzias a Wilson objevují reliktní záření velkého třesku (CMB)', 'Holmdel horn antenna detects the 2.7 K afterglow of the Big Bang across the entire sky.', 'Rohová anténa v Holmdelu zachycuje 2,7K mikrovlnnou ozvěnu počátku vesmíru.'],
  ],
  1965: [
    ['tv', '“Večerníček” Debuts on Czechoslovak Television (ČST)', 'Premiéra „Večerníčku“ v Československé televizi (ČST)', 'Beloved Czech bedtime animated anthology launches on January 2, becoming a multi-generational icon.', 'Legendární český večerní animovaný pořad startuje 2. ledna na vlnách ČST.'],
    ['space', 'Mariner 4 Sends First Close-Up Radio Images of Mars', 'Sonda Mariner 4 posílá první detailní rádiové snímky Marsu', '21 digital frames transmitted at 8.33 bits/s across 216 million km of interplanetary space.', '21 digitálních snímků přenesených rychlostí 8,33 bit/s přes 216 milionů km.'],
    ['tv', '“Lost in Space”, “Get Smart” & Intelsat I (“Early Bird”) Satellite', 'Premiéra „Lost in Space“ a první komerční družice Early Bird', 'Commercial transatlantic satellite television becomes a daily reality.', 'Komerční transatlantická družicová televize Intelsat I zahajuje nepřetržitý provoz.'],
  ],
  1966: [
    ['tv', '“Star Trek” (Original Series) Premieres on NBC', 'Televizní premiéra seriálu „Star Trek“ (TOS) na NBC', 'Gene Roddenberry’s USS Enterprise launches “The Man Trap” into American VHF broadcasts (Sept 8).', 'Hvězdná loď Enterprise vyráží na televizní obrazovky — kultovní vize mezihvězdného průzkumu.'],
    ['tv', '1966 FIFA World Cup Final (England vs. West Germany)', 'Finále mistrovství světa ve fotbale 1966 z Wembley', 'Over 400 million viewers across Europe and the Americas watch the Wembley final live.', 'Přes 400 milionů diváků sleduje finále z Wembley v přímém televizním přenosu.'],
    ['space', 'Luna 9 Soft-Lands on the Moon & Transmits First Lunar Surface Panoramas', 'Luna 9 měkce přistává na Měsíci a vysílá první panoramata', 'Jodrell Bank intercepts and prints the Soviet lunar radio-fax panorama live.', 'Radioteleskop Jodrell Bank živě zachycuje první rádiové panorama z měsíčního povrchu.'],
  ],
  1967: [
    ['tv', '“Our World” — First Global Live Satellite Broadcast (The Beatles “All You Need Is Love”)', '„Our World“ — první celosvětový satelitní přenos (The Beatles)', '400 million viewers in 24 nations watch the first live worldwide multi-satellite TV link.', '400 milionů diváků ve 24 zemích sleduje první simultánní celosvětový družicový přenos.'],
    ['tv', 'Super Bowl I & BBC2 Launches Regular Color TV in Europe (PAL)', 'První Super Bowl a start barevné televize PAL na BBC2', 'Wimbledon 1967 becomes Europe’s first regular PAL color television broadcast.', 'Wimbledon 1967 odstartoval pravidelné barevné vysílání PAL v Evropě.'],
    ['space', 'Jocelyn Bell Burnell Discovers the First Pulsar (CP 1919)', 'Jocelyn Bell Burnell objevuje první pulsar (CP 1919)', 'Regular 1.337-second radio pulses initially nicknamed “LGM-1” (Little Green Men) prove to be a neutron star.', 'Pravidelné 1,337s rádiové pulsy přezdívané „LGM-1“ odhalují rotující neutronové hvězdy.'],
  ],
  1968: [
    ['space', 'Apollo 8 Christmas Eve Lunar Orbit Broadcast (“Earthrise”)', 'Štědrovečerní přenos Apolla 8 z oběžné dráhy Měsíce', 'A quarter of humanity hears Borman, Lovell, and Anders read from lunar orbit over S-band radio.', 'Čtvrtina lidstva sleduje první lidskou posádku vysílající živě z oběžné dráhy Měsíce.'],
    ['radio', 'August 1968 Czechoslovak Radio Emergency Broadcasts', 'Srpnové vysílání Československého rozhlasu (1968)', 'Underground VHF and medium-wave transmitters relay the Prague Spring invasion worldwide.', 'Nouzové rozhlasové vysílače vysílají zprávy o srpnové okupaci do celého světa.'],
    ['tv', '“60 Minutes” & “Mister Rogers’ Neighborhood” Premiere', 'Premiéra „60 Minutes“ a „Columbo“ (pilot)', 'Investigative TV journalism and iconic detective drama launch across North America.', 'Start investigativního magazínu 60 Minutes a prvního filmu legendárního detektiva Columba.'],
  ],
  1969: [
    ['space', 'Apollo 11 Moon Landing — S-Band Lunar Television & “One Small Step”', 'Přistání Apolla 11 na Měsíci — lunární TV a „Malý krok pro člověka“', '650 million viewers watch Neil Armstrong step onto the Sea of Tranquility live via Parkes & Goldstone.', '650 milionů diváků sleduje živě první kroky Neila Armstronga na Moři klidu.'],
    ['tv', '“Monty Python’s Flying Circus” & “Sesame Street” Premiere', 'Premiéra „Monty Pythonova létajícího cirkusu“ a „Sezame, otevři se“', 'Surreal British comedy on BBC1 and groundbreaking educational television on NET/PBS.', 'Surrealistický britský humor na BBC1 a přelomový dětský pořad Sesame Street.'],
    ['radio', 'Woodstock Festival & First ARPANET Message (“LO”)', 'Festival Woodstock a první zpráva sítě ARPANET', 'Counterculture music broadcasts and the birth of packet-switched networking at UCLA/SRI.', 'Rozhlasové záznamy Woodstocku a první datový přenos předchůdce internetu ARPANET.'],
  ],
  1970: [
    ['space', 'Apollo 13 — “Houston, We’ve Had a Problem” S-Band Rescue Telemetry', 'Apollo 13 — „Houstone, máme problém“ (záchranná telemetrie)', 'Continuous Deep Space Network voice links guide the crippled spacecraft safely home around the Moon.', 'Nepřetržité rádiové spojení DSN navádí poškozenou loď bezpečně zpět na Zemi.'],
    ['tv', 'ČST Launches Second Channel (ČST2) & First Color Broadcast (High Tatras)', 'ČST spouští druhý program (ČST2) a první barevný přenos z Tater', 'Skiing World Championships in the High Tatras inaugurate Czechoslovak color television.', 'MS v lyžování ve Vysokých Tatrách zahajuje barevné vysílání Československé televize.'],
    ['tv', '“Monday Night Football” & “The Mary Tyler Moore Show”', 'Premiéra „Monday Night Football“ a „Mary Tyler Moore Show“', 'Prime-time sports and modern workplace comedy redefine 1970s television.', 'Večerní sportovní přenosy a moderní situační komedie 70. let.'],
  ],
  1971: [
    ['space', 'Apollo 15 Live Color Lunar Rover TV & Mariner 9 Orbits Mars', 'Barevný přenos lunárního vozítka Apolla 15 a Mariner 9 u Marsu', 'First live color broadcasts from the Hadley-Apennine lunar mountains and first Mars orbiter radio maps.', 'První barevné televizní záběry lunárního roveru a první mapování Marsu z oběžné dráhy.'],
    ['tv', '“All in the Family”, “Upstairs, Downstairs” & “Columbo” Series', 'Premiéra „All in the Family“ a pravidelného seriálu „Columbo“', 'Socially incisive sitcoms and Sunday mystery movies dominate global UHF/VHF screens.', 'Společensky laděné sitcomy a detektivní seriál Columbo dobývají světové obrazovky.'],
  ],
  1972: [
    ['tv', '“M*A*S*H” Premieres on CBS & Munich 1972 Olympic Broadcasts', 'Premiéra seriálu „M*A*S*H“ na CBS a přenosy z OH Mnichov 1972', 'One of television’s most acclaimed dramedies launches alongside global live Olympic coverage.', 'Jeden z nejslavnějších seriálů všech dob startuje v roce mnichovské olympiády.'],
    ['space', 'Apollo 17 Final Lunar Mission & Pioneer 10 Launches Toward Jupiter', 'Apollo 17 (poslední mise na Měsíc) a start sondy Pioneer 10', 'Last human voices from the Moon and first spacecraft carrying an interstellar golden plaque.', 'Poslední lidský přenos z Měsíce a start první sondy mířící do mezihvězdného prostoru.'],
    ['tv', 'HBO Launches First Pay-Cable Satellite-Bound Network', 'Start stanice HBO (Home Box Office)', 'Regional cable network begins the evolution toward satellite-distributed television.', 'Zahájení vysílání HBO otevírá budoucí éru placené kabelové a satelitní TV.'],
  ],
  1973: [
    ['tv', 'Elvis Presley — “Aloha from Hawaii” First Solo Global Satellite Concert', 'Elvis Presley — „Aloha from Hawaii“, první globální satelitní koncert', 'Broadcast live via Intelsat IV to over 40 countries across Asia, Oceania, and Europe.', 'Živý satelitní přenos přes Intelsat IV do více než 40 zemí světa.'],
    ['space', 'Skylab Orbital TV Broadcasts & Pioneer 10 Jupiter Flyby Telemetry', 'Televizní vstupy ze stanice Skylab a průlet Pioneeru 10 kolem Jupiteru', 'First close-up radio images of Jupiter’s Great Red Spot arrive across 820 million km.', 'První detailní rádiové snímky Jupiteru a živé lekce fyziky z americké stanice Skylab.'],
    ['tv', 'ČST Begins Regular Color Television Broadcasting (SECAM)', 'Československá televize zahajuje pravidelné barevné vysílání', 'Regular color broadcasts go live on ČST2 across Czechoslovakia (May 9).', 'Na druhém programu ČST startuje pravidelné barevné televizní vysílání (9. května).'],
  ],
  1974: [
    ['meti', 'The Arecibo Message (2380 MHz, 3 TW EIRP Toward M13)', 'Zpráva z Areciba (2380 MHz, 3 TW EIRP směrem k M13)', 'Frank Drake & Carl Sagan’s iconic 1,679-bit pictorial interstellar transmission from Puerto Rico!', 'Slavná 1679bitová obrazová zpráva F. Drakea a C. Sagana — milník aktivního SETI!'],
    ['tv', 'Richard Nixon’s Resignation Broadcast & “Happy Days” Premiere', 'Rezignace R. Nixona v přímém přenosu a premiéra „Happy Days“', '110 million watch live US presidential resignation while nostalgia sitcoms top ratings.', '110 milionů diváků sleduje živou rezignaci prezidenta USA v éře aféry Watergate.'],
    ['space', 'Mariner 10 Sends First Close-Up Radio Images of Mercury', 'Sonda Mariner 10 posílá první detailní snímky Merkuru', 'Deep Space Network receives cratered views of the innermost planet across 150 million km.', 'Síť DSN přijímá první snímky kráterů nejbližší planety ke Slunci.'],
  ],
  1975: [
    ['space', 'Apollo–Soyuz Test Project Live Orbital Handshake & Venera 9 on Venus', 'Živé podání rukou Apollo–Sojuz na orbitě a snímky Věněry 9 z Venuše', 'First international orbital TV link and first-ever radio photo from the surface of another planet!', 'První mezinárodní kosmický TV přenos a vůbec první fotografie z povrchu jiné planety (Venuše)!'],
    ['tv', '“Saturday Night Live” & “Fawlty Towers” Premiere', 'Premiéra „Saturday Night Live“ (NBC) a „Hotýlku“ (Fawlty Towers, BBC)', 'Live sketch comedy and John Cleese’s immortal farce hit transatlantic VHF waves.', 'Živá americká skečová show a nesmrtelná britská komedie Johna Cleese.'],
    ['tv', '“Třicet případů majora Zemana” & “Chalupáři” Air on ČST', 'Premiéra českého seriálu „Chalupáři“ v ČST', 'Iconic Czechoslovak comedy series becomes one of the most-watched broadcasts in Czech TV history.', 'Legendární český seriál Chalupáři s Jiřím Sovákem a Josefem Kemrem dobývá obrazovky ČST.'],
  ],
};

const RAW_CHRONICLE_1976_2026 = {
  1976: [
    ['space', 'Viking 1 & 2 Mars Landings — First Live Radio Images from Mars', 'Přistání sond Viking 1 a 2 — první snímky z povrchu Marsu', 'TWO-WAY REPLY HORIZON (50 ly in 2026): Deep Space Network receives historic panoramas from Chryse Planitia!', 'HORIZONT 2-SMĚRNÉ ODEZVY (50 ly v r. 2026): DSN přijímá první snímky z marsovského povrchu!'],
    ['tv', '“The Muppet Show” Premieres Worldwide', 'Světová premiéra „The Muppet Show“', 'Jim Henson’s puppet variety becomes a syndicated hit broadcast in over 100 countries.', 'Loutková show Jima Hensona se vysílá ve více než stovce zemí planety.'],
    ['tv', '1976 Montreal Olympics & Panenka’s Euro 76 Penalty Kick (ČST)', 'Olympiáda Montreal 1976 a Panenkův vršovický dloubák (ME Bělehrad)', 'Czechoslovakia wins Euro 1976 live on European TV while Nadia Comăneci scores the first perfect 10.', 'Antonín Panenka rozhoduje finále ME v Bělehradě živě před stovkami milionů evropských diváků.'],
  ],
  1977: [
    ['space', 'Voyager 1 & 2 Launch + “Wow!” Signal Detected at Big Ear', 'Start sond Voyager 1 a 2 + zachycení signálu „Wow!“ (Big Ear)', 'High-gain X/S-band DSN transmissions launch the Grand Tour; Ohio State records the famous 72-second narrowband spike.', 'Sondy Voyager zahajují velkou pouť k vnějším planetám; radioteleskop Big Ear zachycuje záhadný signál Wow!.'],
    ['tv', '“Roots” Miniseries Breaks All-Time US Television Ratings', 'Minisérie „Kořeny“ (Roots) láme historické rekordy sledovanosti', 'Over 100 million viewers tune in for the finale across eight consecutive nights.', 'Přes 100 milionů diváků sleduje finále průlomové historické minisérie.'],
    ['radio', 'Star Wars Radio/TV Cultural Wave & Punk Radio on BBC John Peel', 'Kulturní vlna Star Wars v éteru a vysílání Johna Peela na BBC', 'John Williams’s orchestral fanfare and global broadcasts sweep the pop-culture spectrum.', 'Fanfáry Star Wars a nová hudební vlna ovládají rozhlas i televizi po celém světě.'],
  ],
  1978: [
    ['tv', '“Dallas”, “Blake’s 7” & “Nemocnice na kraji města” (ČST) Premiere', 'Premiéra „Dallasu“, „Blakeovy sedmičky“ a „Nemocnice na kraji města“', 'Jaroslav Dietl’s Czech medical drama becomes a massive hit across Central Europe and Germany.', 'Seriál Nemocnice na kraji města se stává obrovským hitem v Československu i v zahraničí.'],
    ['space', 'Vladimír Remek — First Non-US/USSR Cosmonaut (Soyuz 28 Live TV)', 'Vladimír Remek — první československý kosmonaut (živý TV přenos)', 'Live orbital broadcasts in Czech from Salyut 6 station thrill viewers across Czechoslovakia!', 'Živé televizní vstupy v češtině z orbitální stanice Saljut 6!'],
    ['radio', '“The Hitchhiker’s Guide to the Galaxy” Radio Premiere (BBC Radio 4)', 'Rozhlasová premiéra „Stopařova průvodce po Galaxii“ (BBC)', 'Douglas Adams’s legendary sci-fi comedy radiates out into the very galaxy it satirizes.', 'Legendární sci-fi komedie Douglase Adamse letí rádiovými vlnami do galaxie, kterou paroduje.'],
  ],
  1979: [
    ['space', 'Voyager 1 & 2 Jupiter Flybys — First Live Volcanic Plumes on Io', 'Průlet Voyageru 1 a 2 kolem Jupiteru — objev sopek na Io', 'High-rate X-band telemetry delivers crystal-clear views of Jupiter’s moons and Great Red Spot.', 'Vysokorychlostní telemetrie v pásmu X přináší detailní snímky Jupiterových měsíců a sopek na Io.'],
    ['tv', 'ESPN Launches First 24-Hour Sports Network & “Life on Earth” (BBC)', 'Start 24hodinové sportovní TV ESPN a „Život na Zemi“ (D. Attenborough)', 'David Attenborough’s landmark natural-history series reaches 500 million global viewers.', 'Přelomový přírodovědný cyklus Davida Attenborougha sleduje půl miliardy diváků.'],
    ['tv', '“Arabela” Filmed & Sony Walkman Changes Portable Radio Culture', 'Premiéra britského „Yes Minister“ (příprava) a nástup satelitních sítí', 'Global UHF/VHF cable-satellite television networks proliferate across America and Europe.', 'Kabelové a satelitní televizní sítě zažívají celosvětový rozmach.'],
  ],
  1980: [
    ['tv', 'Carl Sagan’s “Cosmos: A Personal Voyage” Premieres on PBS', 'Premiéra cyklu „Kosmos“ Carla Sagana (PBS)', '500 million viewers across 60 nations explore the universe — now sweeping past TRAPPIST-1!', '500 milionů diváků v 60 zemích objevuje vesmír — vlna právě minula soustavu TRAPPIST-1!'],
    ['tv', 'CNN Launches First 24-Hour News Channel & “Who Shot J.R.?” (“Dallas”)', 'Start 24hodinového zpravodajství CNN a finále „Kdo střelil J. R.?“', '350 million worldwide watch the Dallas mystery reveal; CNN begins nonstop satellite news.', '350 milionů diváků sleduje rozuzlení seriálu Dallas; CNN zahajuje nepřetržité zprávy.'],
    ['space', 'Voyager 1 Saturn Flyby & “Arabela” Premieres on ČST', 'Průlet Voyageru 1 kolem Saturnu a premiéra „Arabely“ v ČST', 'Stunning views of Saturn’s rings and Titan arrive while Czech fairy-tale fantasy charms Europe.', 'Detailní snímky prstenců Saturnu z DSN a premiéra kultovního seriálu Arabela.'],
  ],
  1981: [
    ['tv', 'MTV Launches (“Video Killed the Radio Star”) & Royal Wedding', 'Start hudební televize MTV a svatba prince Charlese a Diany', '750 million viewers watch the Royal Wedding live; MTV opens 24-hour music video television.', '750 milionů diváků sleduje královskou svatbu; MTV spouští éru hudebních videoklipů.'],
    ['space', 'Space Shuttle Columbia (STS-1) First Orbital Flight Live TV', 'První orbitální let raketoplánu Columbia (STS-1) v přímém přenosu', 'First reusable winged spacecraft broadcasts S-band video from orbit and lands at Edwards AFB.', 'První znovupoužitelný kosmický raketoplán vysílá živě z oběžné dráhy.'],
    ['space', 'Voyager 2 Encounters Saturn & Sets Course for Uranus', 'Voyager 2 prolétá kolem Saturnu a míří k Uranu', 'Deep Space Network locks onto the second Voyager’s high-gain dish across 1.5 billion km.', 'Síť DSN přijímá data ze druhého průletu systémem Saturnu.'],
  ],
  1982: [
    ['tv', '“Cheers”, “Knight Rider” & “Late Night with David Letterman”', 'Premiéra „Na zdraví“ (Cheers), „Knight Rider“ a Davida Lettermana', '1980s pop-culture staples begin broadcasting across thousands of analog VHF/UHF transmitters.', 'Kultovní pořady 80. let se šíří z tisíců analogových VKV a UHF vysílačů.'],
    ['tv', 'Channel 4 Launches in the UK & 1982 FIFA World Cup (Spain)', 'Start britského Channel 4 a MS ve fotbale 1982 ve Španělsku', 'Global satellite coverage brings Italy’s World Cup victory to over a billion viewers.', 'Globální satelitní přenosy přinášejí mistrovství světa více než miliardě diváků.'],
    ['space', 'Venera 13 & 14 Transmit First Color Panoramas from Venus', 'Sondy Věněra 13 a 14 vysílají první barevná panoramata z Venuše', 'Color surface imagery and microphone audio of Venusian wind beamed back to Earth.', 'Barevné záběry a první zvukový záznam větru z povrchu planety Venuše.'],
  ],
  1983: [
    ['tv', '“M*A*S*H” Finale (“Goodbye, Farewell and Amen”) — 106 Million Viewers', 'Finále seriálu „M*A*S*H“ — rekordních 106 milionů diváků', 'The most-watched scripted television episode in American history radiates into space.', 'Nejsledovanější hraná epizoda v americké televizní historii míří do mezihvězdného prostoru.'],
    ['tv', '“Návštěvníci” (The Visitors) Czech Sci-Fi Series Premieres on ČST', 'Premiéra českého sci-fi seriálu „Návštěvníci“ v ČST', 'Ota Hofman & Jindřich Polák’s time-travel sci-fi expedition charms viewers across Europe.', 'Legendární československý sci-fi seriál Expedice Adam 84 dobývá evropské obrazovky.'],
    ['space', 'Sally Ride Becomes First US Woman in Space (STS-7) & Pioneer 10 Passes Neptune', 'Sally Ride ve vesmíru (STS-7) a Pioneer 10 míjí dráhu Neptunu', 'Live Ku-band shuttle television relays via the newly deployed TDRS-1 satellite.', 'První využití komunikační družice TDRS-1 pro živé televizní přenosy z raketoplánu.'],
  ],
  1984: [
    ['tv', 'Apple “1984” Super Bowl Commercial & “The Cosby Show” / “Miami Vice”', 'Reklama Apple „1984“ na Super Bowlu a premiéra „Miami Vice“', 'Ridley Scott’s Macintosh spot and neon-drenched stereo TV redefine visual broadcasting.', 'Slavný spot na Macintosh a stereofonní barevné vysílání definují estetiku 80. let.'],
    ['space', 'Bruce McCandless’s First Untethered Spacewalk (STS-41-B Live Video)', 'První volný výstup člověka do vesmíru bez poutacího lana (MMU)', 'Iconic live television images show an astronaut floating freely against the blackness of space.', 'Ikonické živé záběry astronauta vznášejícího se volně v otevřeném vesmíru.'],
    ['tv', '1984 Los Angeles Olympic Games Global Broadcast', 'Celosvětové televizní přenosy z OH Los Angeles 1984', 'Over 2.5 billion viewers watch live satellite transmissions across 156 nations.', 'Přes 2,5 miliardy diváků ve 156 zemích sleduje olympijské hry v přímém přenosu.'],
  ],
  1985: [
    ['tv', 'Live Aid Global Charity Concert (London & Philadelphia)', 'Globální dobročinný koncert Live Aid (Londýn a Filadelfie)', '1.9 billion viewers in 150 nations watch Queen’s Wembley set live — wavefront right near TRAPPIST-1!', '1,9 miliardy diváků ve 150 zemích sleduje koncert Queen — čelo vlny právě u TRAPPIST-1!'],
    ['tv', '“The Golden Girls”, “MacGyver” & “EastEnders” Premiere', 'Premiéra „MacGyvera“, „Golden Girls“ a britských „EastEnders“', 'Peak analog UHF/VHF entertainment broadcasts blanket the inner 41 light-years.', 'Vrchol analogové UHF/VKV zábavní éry právě dosahuje hranice 41 světelných let.'],
    ['space', 'ICE (ISEE-3) Makes First Comet Flyby (Giacobini–Zinner)', 'Sonda ICE uskutečňuje první průlet kolem komety v dějinách', 'Deep Space Network tracks humanity’s first direct cometary plasma measurements.', 'Síť DSN zachycuje první přímá měření z ohonu komety.'],
  ],
  1986: [
    ['space', 'Voyager 2 Uranus Flyby & Giotto Close-Up of Halley’s Comet Nucleus', 'Průlet Voyageru 2 kolem Uranu a snímky jádra Halleyovy komety (Giotto)', 'First-ever spacecraft images of Uranus, Miranda, and a live European TV encounter with Halley’s Comet!', 'První snímky Uranu a živý evropský přenos sondy Giotto přímo z jádra Halleyovy komety!'],
    ['tv', 'Challenger Disaster Live Broadcast & “The Oprah Winfrey Show”', 'Živý přenos tragédie raketoplánu Challenger a start show Oprah Winfrey', 'Millions witness the STS-51-L loss live on CNN and schoolroom TVs worldwide.', 'Miliony diváků sledují živě tragédii raketoplánu Challenger.'],
    ['tv', '1986 FIFA World Cup (Maradona’s “Goal of the Century”) & Mir Station Launch', 'MS ve fotbale 1986 (Maradona) a start orbitální stanice Mir', 'Global television watches Mexico 86 as Soviet Mir begins 15 years of orbital radio links.', 'Svět sleduje mexický šampionát, zatímco stanice Mir zahajuje 15 let vysílání z orbity.'],
  ],
  1987: [
    ['tv', '“Star Trek: The Next Generation” Premieres in Syndication', 'Premiéra seriálu „Star Trek: Nová generace“ (TNG)', 'Captain Jean-Luc Picard’s Enterprise-D beams out across 210+ VHF/UHF stations (~39 ly out)!', 'Kapitán Picard a Enterprise-D míří do vesmíru z více než 210 analogových vysílačů (~39 ly daleko)!'],
    ['space', 'Supernova 1987A Observed Worldwide — First Naked-Eye Supernova Since 1604', 'Supernova 1987A — první supernova viditelná pouhým okem od r. 1604', 'Global astronomical radio & neutrino alerts announce a dying star in the Large Magellanic Cloud.', 'Celosvětová astronomická zpravodajství oznamují výbuch supernovy ve Velkém Magellanově mračnu.'],
    ['tv', '“Married... with Children” & “The Simpsons” Shorts Debut on Fox', 'Start televize Fox, „Ženatý se závazky“ a první krátcí „Simpsonovi“', 'America’s fourth broadcast network adds hundreds of new UHF transmitters to Earth’s radio shell.', 'Čtvrtá americká síť Fox přidává stovky nových UHF vysílačů do rádiové bubliny Země.'],
  ],
  1988: [
    ['tv', '“Red Dwarf” (BBC2) & “The Wonder Years” Premiere', 'Premiéra kultovního sci-fi sitcomu „Červený trpaslík“ (BBC2)', 'Dave Lister, Rimmer, Cat, and Kryten’s deep-space comedy broadcasts into the real cosmos.', 'Kultovní vesmírná komedie BBC letí z britských vysílačů do skutečného vesmíru.'],
    ['tv', '1988 Seoul Olympic Games — First NHK Analog HDTV Satellite Tests', 'OH Soul 1988 — první satelitní přenosy ve vysokém rozlišení (HDTV)', 'Experimental MUSE analog HDTV signals beam alongside global Olympic coverage.', 'Experimentální HDTV přenosy doprovázejí celosvětové vysílání z olympiády v Soulu.'],
    ['space', 'Buran Uncrewed Orbital Flight & Autonomous Landing Telemetry', 'Bezpilotní orbitální let a automatické přistání raketoplánu Buran', 'Soviet orbital telemetry guides the shuttle to a precise automated runway landing at Baikonur.', 'Sovětská kosmická telemetrie navádí raketoplán Buran na přesné automatické přistání.'],
  ],
  1989: [
    ['tv', 'Fall of the Berlin Wall & Velvet Revolution Broadcasts (Prague)', 'Pád Berlínské zdi a přímé přenosy Sametové revoluce z Letné', 'Historic live ČST broadcasts from Wenceslas Square and Letná Plain sweep across Europe and the world!', 'Historické přímé přenosy ČST z Václavského náměstí a Letenské pláně obletěly celou planetu!'],
    ['space', 'Voyager 2 Neptune & Triton Flyby — Grand Tour Complete', 'Průlet Voyageru 2 kolem Neptunu a Tritonu — završení Velké pouti', 'Deep Space Network + Very Large Array combine to catch faint 4.1-hour-old X-band signals from Neptune!', 'Antény DSN a VLA společně zachycují slabý 4,1 hodiny starý signál od modrého obra Neptunu!'],
    ['tv', '“The Simpsons” & “Seinfeld” Premiere as Full Series', 'Seriálová premiéra „Simpsonových“ a „Show Jerryho Seinfelda“', 'Two of the most influential comedies in TV history enter global airwaves (~37 ly out).', 'Dvě nejvlivnější televizní komedie všech dob vstupují do globálního éteru (~37 ly daleko).'],
  ],
  1990: [
    ['space', 'Hubble Space Telescope Launches & Voyager 1 “Pale Blue Dot”', 'Start Hubbleova vesmírného dalekohledu a „Bleděmodrá tečka“ Voyageru 1', 'Voyager 1 turns back from 6 billion km to photograph Earth as a 0.12-pixel mote of dust.', 'Voyager 1 z 6 miliard km fotografuje Zemi jako nepatrnou bleděmodrou tečku v paprsku světla.'],
    ['tv', '“Twin Peaks” & “The Fresh Prince of Bel-Air” Premiere', 'Premiéra „Městečka Twin Peaks“ Davida Lynche', 'David Lynch’s surreal mystery drama transforms serialized television storytelling.', 'Surrealistická detektivka Davida Lynche navždy mění podobu televizních seriálů.'],
    ['tv', '1990 FIFA World Cup (Italia ’90) & German Reunification Broadcast', 'MS ve fotbale Itálie 1990 a přenosy sjednocení Německa', 'Three Tenors concert in Rome and global World Cup broadcasts beam across Intelsat.', 'Koncert Tří tenorů v Římě a celosvětové fotbalové přenosy přes družice Intelsat.'],
  ],
  1991: [
    ['tv', 'Persian Gulf War — CNN Live Satellite News from Baghdad', 'Válka v Perském zálivu — živé satelitní přenosy CNN z Bagdádu', 'First war covered live via portable satellite uplinks across worldwide television.', 'První konflikt přenášený živě po celém světě přes přenosné satelitní stanice.'],
    ['space', 'Galileo First Asteroid Flyby (951 Gaspra) & Helen Sharman on Mir', 'Sonda Galileo u asteroidu Gaspra a Helen Sharman na stanici Mir', 'First spacecraft close-up of an asteroid and first British astronaut radio links from orbit.', 'První detailní snímky asteroidu zblízka a spojení první britské astronautky z Miru.'],
    ['radio', 'World Wide Web Announced & Soviet Union Dissolution Broadcasts', 'Oznámení World Wide Webu a rozpad SSSR v živém vysílání', 'Mikhail Gorbachev’s Christmas Day resignation airs live worldwide on December 25.', 'Vánoční rezignace Michaila Gorbačova vysílaná živě do celého světa.'],
  ],
  1992: [
    ['space', 'COBE Satellite Announces Cosmic Microwave Background Ripples', 'Družice COBE objevuje teplotní fluktuace reliktního záření', 'Astronomers reveal the “baby picture of the universe” — seeds of all galaxies.', 'Astronomové odhalují „dětskou fotografii vesmíru“ — zárodky dnešních galaxií.'],
    ['tv', '1992 Barcelona Olympics (US Dream Team) & Cartoon Network Launch', 'OH Barcelona 1992 (Dream Team) a start stanice Cartoon Network', 'Global broadcasts celebrate Barcelona as Czechoslovak TV prepares its transition to ČT.', 'Globální olympijské přenosy z Barcelony; vznik nové generace tematických stanic.'],
    ['space', 'First Confirmed Exoplanets Discovered (PSR B1257+12 by Wolszczan & Frail)', 'Objev prvních potvrzených exoplanet (u pulsaru PSR B1257+12)', 'Arecibo radio timing uncovers alien worlds orbiting a millisecond pulsar!', 'Rádiová měření z Areciba odhalují první potvrzené planety mimo Sluneční soustavu!'],
  ],
  1993: [
    ['tv', '“The X-Files”, “Star Trek: Deep Space Nine” & “Babylon 5” Pilot', 'Premiéra „Akt X“, „Star Trek: Stanice Deep Space Nine“ a „Babylonu 5“', 'A golden triad of iconic sci-fi television launches in a single landmark year (~33 ly out)!', 'Zlatá trojice kultovních sci-fi seriálů startuje v jediném přelomovém roce (~33 ly daleko)!'],
    ['tv', 'Czech Television (ČT) Launches on Jan 1 + First Private Czech TV Premiéra', 'Vznik samostatné České televize (1. ledna) a první soukromé TV Premiéra', 'Independent Czech public broadcasting begins alongside the first private Central European TV channel.', 'Samostatná Česká televize a první česká soukromá televize zahajují vysílání.'],
    ['space', 'Hubble Servicing Mission 1 (STS-61) Fixes Space Telescope Optics Live', 'První servisní mise k Hubbleovu dalekohledu (STS-61) v přímém přenosu', 'Live spacewalk video shows astronauts installing COSTAR corrective mirrors in orbit.', 'Živé záběry kosmických výstupů při záchraně zraku Hubbleova dalekohledu.'],
  ],
  1994: [
    ['tv', '“Friends” & “ER” Premiere on NBC + TV Nova Launches in Czechia', 'Premiéra „Přátel“ a „Pohotovosti“ + start TV Nova v ČR', 'TV Nova breaks Central European viewership records while Friends begins a global decade-long run.', 'TV Nova mění český televizní trh; americký sitcom Přátelé odstartoval globální fenomén.'],
    ['space', 'Comet Shoemaker–Levy 9 Slams Into Jupiter — Live Global Coverage', 'Srážka komety Shoemaker–Levy 9 s Jupiterem v celosvětovém přenosu', 'Hubble and ground observatories broadcast Earth-sized dark scars across Jupiter’s cloud tops.', 'Hubble a pozemské observatoře živě ukazují stopy po nárazu fragmentů komety do Jupiteru.'],
    ['tv', 'Nelson Mandela’s Presidential Inauguration Broadcast Worldwide', 'Inaugurace Nelsona Mandely přenášená po celé planetě', 'Over 1 billion viewers watch South Africa’s democratic transition live from Pretoria.', 'Přes miliardu diváků sleduje živý přenos inaugurace Nelsona Mandely v Pretorii.'],
  ],
  1995: [
    ['space', '51 Pegasi b — First Exoplanet Around a Sun-Like Star & Galileo Enters Jupiter Orbit', '51 Pegasi b — první exoplaneta u hvězdy typu Slunce + sonda Galileo u Jupiteru', 'Mayor & Queloz’s Nobel-winning discovery ignites modern exoplanet science; Galileo drops an atmospheric probe.', 'Nobelovský objev 51 Pegasi b startuje moderní éru exoplanet; sonda Galileo vstupuje na dráhu Jupiteru.'],
    ['tv', '“Star Trek: Voyager” & “Xena: Warrior Princess” Premiere', 'Premiéra seriálů „Star Trek: Voyager“ a „Xena“', 'Captain Janeway’s Delta Quadrant voyage beams out on UPN’s debut evening (~31 ly away).', 'Plavba lodi Voyager Delta kvadrantem startuje na vlnách nové sítě UPN (~31 ly daleko).'],
    ['space', 'Hubble Deep Field Image Unveiled to the World', 'Zveřejnění snímku Hubbleova hlubokého pole (HDF)', 'Ten days staring at an empty patch of sky reveals 3,000 distant galaxies across cosmic time.', 'Desetidenní expozice prázdného kousku oblohy odhaluje 3 000 vzdálených galaxií.'],
  ],
  1996: [
    ['tv', '1996 Atlanta Olympic Games & “3rd Rock from the Sun” / “Pokémon” Debuts', 'OH Atlanta 1996 a start fenoménu Pokémon & „Takoví normální mimozemšťané“', 'Analog TV nears its historical peak power before the gradual digital cable/satellite shift.', 'Analogová televize kulminuje na svém historickém výkonu před postupnou digitalizací.'],
    ['space', 'SOHO Solar Observatory Begins Continuous Space Weather Telemetry', 'Sluneční observatoř SOHO zahajuje nepřetržitou telemetrii z bodu L1', 'Continuous Deep Space Network links monitor coronal mass ejections and discover thousands of comets.', 'Nepřetržité spojení DSN sleduje sluneční bouře a objevuje tisíce komet.'],
    ['radio', 'First Streaming Web Radio Broadcasts Emerge Alongside FM', 'První internetové rozhlasové přenosy vedle tradičního FM', 'Early RealAudio streams mark the first step toward Earth’s eventual radio quieting.', 'První internetové audio streamy předznamenávají pozdější éru digitálního ztišení Země.'],
  ],
  1997: [
    ['space', 'Mars Pathfinder & Sojourner Rover — First Live Rover Images from Mars', 'Mars Pathfinder a vozítko Sojourner — první rover na Marsu', 'Bouncing airbag landing and Sojourner’s Martian rock trek generate record web & TV traffic.', 'Přistání v airbazích a první jízda marsovského vozítka fascinují diváky po celém světě.'],
    ['tv', '“Stargate SG-1”, “Buffy the Vampire Slayer” & “South Park” Premiere', 'Premiéra „Hvězdné brány“ (Stargate SG-1), „Buffy“ a „Městečka South Park“', 'Three massive genre series join Princess Diana’s 2.5-billion-viewer global funeral broadcast.', 'Tři kultovní seriály v roce celosvětově sledovaného pohřbu princezny Diany (2,5 mld. diváků).'],
    ['space', 'Cassini–Huygens Launches Toward Saturn & Titan', 'Start mise Cassini–Huygens k Saturnu a Titanu', 'Deep Space Network begins a 20-year X-band communication saga across the outer Solar System.', 'Síť DSN zahajuje dvacetileté spojení s nejambicióznější misí k Saturnu.'],
  ],
  1998: [
    ['tv', 'Nagano 1998 Olympic Hockey Final (Czech Republic Gold!) & “Seinfeld” Finale', 'Zlaté finále hokejového turnaje století v Naganu (ČR–Rusko) a finále „Seinfelda“', 'Czech Republic wins Olympic ice hockey gold live before millions; 76 million watch Seinfeld’s sign-off.', 'Petr Svoboda střílí zlatý gól v Naganu — nejsledovanější sportovní přenos moderní české historie!'],
    ['space', 'International Space Station (ISS) First Modules Launch (Zarya & Unity)', 'Start prvních modulů Mezinárodní vesmírné stanice (ISS)', 'Continuous orbital radio, amateur ham links, and S/Ku-band video begin permanently above Earth.', 'Nepřetržité rádiové a video spojení z trvale obydlené orbitální základny lidstva.'],
    ['tv', 'First Regular Digital Terrestrial TV (DVB-T UK & ATSC US) Begins', 'Zahájení prvního pravidelného digitálního pozemního vysílání (DVB-T/ATSC)', 'Spread-spectrum digital TV begins reducing Earth’s sharp analog carrier spikes.', 'Digitální vysílání s rozprostřeným spektrem postupně mění rádiový podpis Země.'],
  ],
  1999: [
    ['meti', 'Cosmic Call 1 — Evpatoria RT-70 Planetary Radar METI Beam', 'Cosmic Call 1 — cílený METI signál z radaru Jevpatorija RT-70', '150 kW interstellar Rosetta Stone beamed at 5.01 GHz toward 16 Cygni, 15 Sge, Gl 777 & HD 178428 (~27 ly out)!', '150kW mezihvězdná Rosettská deska vyslaná k 16 Cygni a dalším hvězdám (~27 ly daleko)!'],
    ['tv', '“The Sopranos”, “Futurama”, “SpongeBob” & “The West Wing” Premiere', 'Premiéra „Rodiny Sopránů“, „Futuramy“, „SpongeBoba“ a „Západního křídla“', 'Prestige television drama and beloved sci-fi animation debut at the turn of the millennium.', 'Nástup prestižního televizního dramatu a kultovní sci-fi animace na prahu tisíciletí.'],
    ['tv', '“2000 Today” — 24-Hour Global Millennium Eve Broadcast', '„2000 Today“ — 24hodinový celosvětový silvestrovský přenos', 'Over 1 billion viewers follow New Year fireworks across every time zone from Kiribati to Samoa.', 'Přes miliardu diváků sleduje příchod roku 2000 napříč všemi časovými pásmy planety.'],
  ],
  2000: [
    ['space', 'ISS Expedition 1 — Humanity Begins Continuous Presence in Space', 'Expedice 1 na ISS — začátek nepřetržité přítomnosti lidstva ve vesmíru', 'Bill Shepherd, Yuri Gidzenko, and Sergei Krikalev open permanent daily orbital radio/TV downlinks.', 'Posádka Expedice 1 zahajuje dodnes nepřerušenou lidskou přítomnost na oběžné dráze.'],
    ['tv', '2000 Sydney Olympic Games & “CSI” / “Survivor” Premiere', 'OH Sydney 2000 a premiéra „Kriminálky Las Vegas“ (CSI)', 'Global satellite TV covers Sydney as forensic drama and reality TV sweep prime time.', 'Globální přenosy ze Sydney a nástup nové vlny kriminálních a reality formátů.'],
    ['space', 'NEAR Shoemaker Enters Orbit Around Asteroid 433 Eros', 'Sonda NEAR Shoemaker vstupuje na dráhu planetky 433 Eros', 'First spacecraft to orbit an asteroid transmits high-resolution laser and radio maps.', 'První umělá družice asteroidu posílá detailní mapy z hlubokého vesmíru.'],
  ],
  2001: [
    ['meti', 'Teen Age Message — Evpatoria RT-70 Theremin Concert & Digital METI', 'Teen Age Message — koncert na theremin vyslaný z Jevpatorije ke hvězdám', 'First musical METI broadcast sent at 5.01 GHz toward six solar-type stars including 47 Ursae Majoris!', 'První hudební METI signál vyslaný k šesti hvězdám podobným Slunci včetně 47 Ursae Majoris!'],
    ['tv', 'September 11 Live Global Television News Broadcasts', 'Přímé celosvětové zpravodajské přenosy z 11. září 2001', 'Over 2 billion viewers worldwide witness breaking live coverage across every major network.', 'Přes 2 miliardy lidí na planetě sledují mimořádné zpravodajství v přímém přenosu.'],
    ['tv', '“Band of Brothers”, “24”, “The Office” (UK) & “Star Trek: Enterprise”', 'Premiéra „Bratrstva neohrožených“, „24 hodin“ a „Kanclu“ (UK)', 'Cinematic miniseries and mockumentary comedy redefine 21st-century television.', 'Filmové minisérie a britský mokument definují televizi 21. století.'],
  ],
  2002: [
    ['tv', '“The Wire”, “Firefly” & 2002 FIFA World Cup (Korea/Japan)', 'Premiéra „The Wire“, „Firefly“ a MS ve fotbale 2002', 'Joss Whedon’s cult space-Western and HBO’s acclaimed drama debut alongside global World Cup broadcasts.', 'Kultovní vesmírný western Firefly a kritiky oceňované drama The Wire.'],
    ['space', 'Mars Odyssey Maps Subsurface Water Ice Across Mars', 'Sonda Mars Odyssey mapuje podpovrchový vodní led na Marsu', 'Gamma-ray spectrometer telemetry confirms vast frozen water reservoirs beneath Martian soil.', 'Telemetrie z oběžné dráhy potvrzuje rozsáhlé zásoby vodního ledu pod povrchem Marsu.'],
  ],
  2003: [
    ['meti', 'Cosmic Call 2 — Evpatoria RT-70 Beam to 55 Cancri & 47 UMa', 'Cosmic Call 2 — radarový paprsek k 55 Cancri a 47 UMa', 'High-power 150 kW bilingual scientific/cultural message beamed to five nearby planetary systems (~23 ly out)!', 'Vysokovýkonná vědecká a kulturní zpráva vyslaná k pěti blízkým soustavám (~23 ly daleko)!'],
    ['space', 'Shenzhou 5 — Yang Liwei Launches China’s First Crewed Spaceflight', 'Šen-čou 5 — Jang Li-wej zahajuje čínské pilotované lety', 'Live orbital video from China’s first taikonaut alongside Space Shuttle Columbia’s tragic loss.', 'Živé orbitální přenosy prvního čínského tchajkonauta v kosmu.'],
    ['tv', '“Battlestar Galactica” Miniseries & “Arrested Development” Premiere', 'Premiéra minisérie „Battlestar Galactica“ a „Arrested Development“', 'Reimagined sci-fi survival saga launches on Sci Fi Channel.', 'Moderní reimaginace kultovní sci-fi ságy o přežití lidstva.'],
  ],
  2004: [
    ['space', 'Spirit & Opportunity Land on Mars + Cassini Enters Saturn Orbit', 'Přistání roverů Spirit a Opportunity na Marsu + Cassini u Saturnu', 'Twin Mars rovers and Cassini’s historic Saturn arrival beam high-bandwidth X-band telemetry via DSN.', 'Dvojice marsovských vozítek a přílet Cassiniho k Saturnu zaplavují DSN obrazy cizích světů.'],
    ['tv', '“Lost”, “House M.D.” & 2004 Athens Olympic Games', 'Premiéra „Ztracených“ (Lost), „Dr. House“ a OH Atény 2004', 'Global watercooler mystery drama and Athens broadcasts beam across 220 territories.', 'Globální seriálový fenomén Ztracení a návrat olympijských her do Atén.'],
    ['tv', '“Friends” Finale & EU Enlargement Live Celebrations (Prague/Europe)', 'Finále „Přátel“ a přenosy vstupu ČR do Evropské unie (1. května)', '52.5 million watch the Friends finale as ten European nations broadcast EU accession celebrations.', '52,5 milionu diváků sleduje finále Přátel; Evropa slaví rozšíření EU v přímém přenosu.'],
  ],
  2005: [
    ['space', 'Huygens Lands on Titan — Furthest Surface Radio Broadcast in History', 'Přistání modulu Huygens na Titanu — nejvzdálenější povrchový přenos', 'ESA’s probe transmits river channels, ice pebbles, and wind audio from 1.2 billion km away!', 'Evropská sonda vysílá obrazy metanových řek a zvuk větru z měsíce Saturnu ze vzdálenosti 1,2 mld. km!'],
    ['tv', '“Doctor Who” Revival (BBC), “The Office” (US) & “Avatar: The Last Airbender”', 'Návrat „Doctora Who“ (BBC) a premiéra amerického „Kanclu“', 'Modern Doctor Who revives British Saturday sci-fi television for a global new generation.', 'Obnovený Doctor Who vrací britské sci-fi do celosvětového hlavního vysílacího času.'],
    ['radio', 'YouTube Launches & First Digital DVB-T Switchover Accelerates', 'Start YouTube a nástup přechodu na digitální vysílání DVB-T', 'Online video begins shifting global culture away from high-power analog terrestrial towers.', 'Online video zahajuje postupný odklon od vysokovýkonných analogových pozemních vysílačů.'],
  ],
  2006: [
    ['space', 'New Horizons Launches Toward Pluto & Stardust Returns Comet Dust', 'Start sondy New Horizons k Plutu a návrat vzorků komety Stardust', 'Fastest spacecraft ever launched begins a 9.5-year X-band trek to the Kuiper Belt.', 'Nejrychlejší sonda historie zahajuje devítiletou cestu k Plutu a Kuiperovu pásu.'],
    ['tv', '“Planet Earth” (BBC HD) & 2006 FIFA World Cup (Germany)', 'Dokument „Zázračná planeta“ (BBC v HD) a MS ve fotbale 2006', 'First BBC wildlife series filmed completely in High Definition captivates half a billion viewers.', 'První velký přírodovědný cyklus BBC natočený plně ve vysokém rozlišení HD.'],
    ['radio', 'IAU Prague General Assembly Reclassifies Pluto (Live Press Broadcast)', 'Valné shromáždění IAU v Praze mění definici planety (Pluto)', 'Live worldwide news from Prague announces the new “dwarf planet” classification.', 'Živé zpravodajství z pražského kongresu IAU oznamuje zařazení Pluta mezi trpasličí planety.'],
  ],
  2007: [
    ['tv', '“The Big Bang Theory”, “Mad Men” & “Top Gear” Polar Special', 'Premiéra „Teorie velkého třesku“ a „Šílenců z Manhattanu“ (Mad Men)', 'Physics sitcom and AMC’s prestige era premiere worldwide (~19 ly wavefront).', 'Fyzikální sitcom a prestižní dobové drama obletí světové obrazovky (~19 ly daleko).'],
    ['space', 'Phoenix Launches to Mars Arctic & Kaguya (SELENE) HD Earthrise Video', 'Start Mars Phoenix a první HDTV záběry „východu Země“ ze sondy Kaguja', 'Japan’s lunar orbiter beams crystal-clear 1080i video of Earth rising over the Moon’s horizon!', 'Japonská lunární sonda Kaguja vysílá první 1080i HD video Země vycházející nad Měsícem!'],
  ],
  2008: [
    ['meti', 'A Message From Earth (AMFE → Gliese 581) & NASA “Across the Universe” (→ Polaris)', 'AMFE ke Gliese 581 a píseň Beatles „Across the Universe“ k Polárce', '501 digital messages beamed from Yevpatoria toward Gliese 581 (20.3 ly — arriving in 2029!!).', '501 digitálních zpráv z Jevpatorije ke Gliese 581 (20,3 ly — přílet už v roce 2029!!).'],
    ['tv', '“Breaking Bad” Premieres & 2008 Beijing Olympics (4.7 Billion Viewers)', 'Premiéra „Perníkového táty“ (Breaking Bad) a OH Peking 2008', 'Zhang Yimou’s Beijing opening ceremony becomes one of the most-watched live TV broadcasts ever.', 'Zahajovací ceremoniál v Pekingu patří k nejsledovanějším živým přenosům lidstva.'],
    ['space', 'Large Hadron Collider First Beam Live Webcast & Phoenix Mars Ice Confirmation', 'První svazek v urychlovači LHC (CERN) a led pod sondou Phoenix na Marsu', 'Live CERN control-room coverage celebrates startup of humanity’s largest particle accelerator.', 'Živý přenos ze sálu CERN oslavuje spuštění největšího urychlovače částic na světě.'],
  ],
  2009: [
    ['space', 'Kepler Space Telescope Launches — Exoplanet Revolution Begins', 'Start vesmírného dalekohledu Kepler — revoluce exoplanet', 'Ka-band downlinks begin uncovering thousands of alien worlds across Cygnus.', 'Přenosy v pásmu Ka odstartovaly objev tisíců cizích planet v souhvězdí Labutě.'],
    ['meti', 'Hello From Earth (Canberra DSS-43 → Gliese 581)', 'Hello From Earth (anténa DSS-43 Canberra → Gliese 581)', '25,880 public messages beamed via NASA’s 70-meter Australian DSN dish toward Gliese 581.', '25 880 veřejných vzkazů vyslaných 70m anténou DSN v Austrálii směrem ke Gliese 581.'],
    ['tv', 'US Analog Full-Power TV Switch-Off (June 12) & “Modern Family” Premiere', 'Vypnutí analogové televize v USA (12. června) a premiéra „Takové moderní rodinky“', 'America shuts down megawatt analog VHF/UHF TV towers, noticeably quieting Earth’s leakage spectrum!', 'Vypnutí megawattových analogových TV vysílačů v USA znatelně ztišuje rádiový únik Země!'],
  ],
  2010: [
    ['tv', '“Sherlock” (BBC), “The Walking Dead” & 2010 FIFA World Cup (South Africa)', 'Premiéra „Sherlocka“ (BBC), „Živých mrtvých“ a MS ve fotbale 2010', '3.2 billion viewers tune into South Africa 2010; Benedict Cumberbatch’s Sherlock captivates Britain.', '3,2 miliardy diváků sleduje jihoafrický šampionát; BBC uvádí moderního Sherlocka.'],
    ['space', 'Hayabusa Returns First Asteroid Samples & SDO 4K Solar Telemetry', 'Návrat sondy Hajabusa ze vzorky planetky Itokawa a observatoř SDO', 'Solar Dynamics Observatory opens continuous 150 Mbps Ka-band live imaging of the Sun.', 'Observatoř SDO zahajuje nepřetržité 150Mb/s vysílání snímků Slunce ve vysokém rozlišení.'],
  ],
  2011: [
    ['tv', '“Game of Thrones” & “Black Mirror” Premiere + Czech Analog TV Switch-Off', 'Premiéra „Hry o trůny“ a „Černého zrcadla“ + vypnutí analogové TV v ČR', 'Czechia completes full DVB-T digital transition (Nov 2011) as HBO launches fantasy television’s biggest saga.', 'Česko dokončuje vypnutí analogové TV (listopad 2011); HBO spouští Hru o trůny.'],
    ['space', 'Final Space Shuttle Flight (STS-135 Atlantis) & MESSENGER Orbits Mercury', 'Poslední let raketoplánu (STS-135 Atlantis) a sonda MESSENGER u Merkuru', 'Thirty years of Space Shuttle orbital television conclude as MESSENGER begins mapping Mercury.', 'Třicetiletá éra raketoplánů končí; MESSENGER mapuje planetu Merkur z oběžné dráhy.'],
  ],
  2012: [
    ['space', 'Curiosity Rover “Seven Minutes of Terror” Mars Landing & Higgs Boson Live', 'Přistání roveru Curiosity na Marsu a objev Higgsova bosonu (CERN)', 'Live Odyssey UHF-to-DSN relay from Gale Crater and CERN’s announcement of the Higgs particle (~14 ly out)!', 'Živý přenos přistání v kráteru Gale i oznámení objevu Higgsova bosonu v CERN (~14 ly daleko)!'],
    ['tv', '2012 London Olympic Games & Felix Baumgartner’s Stratosphere Jump', 'OH Londýn 2012 a skok Felixe Baumgartnera ze stratosféry (39 km)', 'Danny Boyle’s London ceremony and Red Bull Stratos set live streaming and broadcast records.', 'Londýnská olympiáda a živý přenos prvního nadzvukového seskoku ze stratosféry.'],
    ['space', 'Voyager 1 Crosses the Heliopause Into Interstellar Space', 'Voyager 1 překračuje heliopauzu do mezihvězdného prostoru', 'Plasma-wave radio recordings capture the literal sound of interstellar space around the probe.', 'Záznamy plazmových vln přinášejí první měření skutečného mezihvězdného prostředí.'],
  ],
  2013: [
    ['space', 'Chris Hadfield’s “Space Oddity” from ISS & ESA Gaia Launches', 'Chris Hadfield zpívá „Space Oddity“ z ISS a start družice ESA Gaia', 'First music video recorded in orbit goes viral as ESA’s Gaia launches to map 1.8 billion stars (the source of this map!).', 'První hudební klip z oběžné dráhy a start mise ESA Gaia — zdroje dat naší 3D mapy!'],
    ['tv', '“Breaking Bad” Finale, “House of Cards” (First Netflix Original) & “Rick and Morty”', 'Finále „Perníkového táty“, „Domek z karet“ a premiéra „Ricka a Mortyho“', 'Streaming-first scripted series reshape how humanity consumes television.', 'Streamovací premiéry zásadně mění globální distribuci televize.'],
  ],
  2014: [
    ['space', 'ESA Rosetta & Philae First-Ever Comet Landing (67P/Churyumov–Gerasimenko)', 'Historické přistání modulu Philae na kometě 67P (mise ESA Rosetta)', 'Live ESA Darmstadt telemetry confirms touchdown 510 million km away (~12 ly wavefront)!', 'Živá telemetrie ESA potvrzuje první přistání lidské sondy na jádru komety (510 mil. km daleko)!'],
    ['tv', '2014 FIFA World Cup (Brazil) & “True Detective” / “Fargo” Premiere', 'MS ve fotbale 2014 v Brazílii a premiéra „Temného případu“ a „Farga“', 'Over 3.2 billion viewers follow Brazil 2014 across HD satellite and digital terrestrial networks.', 'Přes 3,2 miliardy diváků sleduje šampionát v Brazílii v HD přenosech.'],
  ],
  2015: [
    ['space', 'New Horizons Pluto Flyby & SpaceX First Orbital Booster Landing', 'Průlet New Horizons kolem Pluta a první přistání 1. stupně Falcon 9', 'Live DSN signal lock reveals Pluto’s heart-shaped glacier Tombaugh Regio; Falcon 9 lands upright at Cape Canaveral!', 'DSN odhaluje ledovcové srdce Pluta; Falcon 9 uskutečňuje první vertikální přistání nosné rakety!'],
    ['tv', '“The Expanse”, “Better Call Saul” & “Mr. Robot” Premiere', 'Premiéra hard sci-fi seriálu „Expanze“ (The Expanse) a „Volejte Saulovi“', 'Critically acclaimed hard-science space opera hits Syfy broadcasts.', 'Oceňovaná realistická vesmírná sci-fi sága vstupuje na obrazovky.'],
    ['space', 'LIGO Detects First Gravitational Waves (GW150914 — Announced 2016)', 'Detektory LIGO zachycují první gravitační vlny ze srážky černých děr', 'Two colliding black holes 1.3 billion light-years away chirp across Earth’s laser interferometers.', 'Srážka dvou černých děr 1,3 miliardy světelných let daleko rozechvívá laserové interferometry LIGO.'],
  ],
  2016: [
    ['space', 'Proxima Centauri b Discovered & Juno Enters Jupiter Orbit', 'Objev planety Proxima Centauri b a přílet sondy Juno k Jupiteru', 'ESO announces a terrestrial world in the habitable zone of our nearest star — right as this broadcast crosses 10 ly!', 'ESO oznamuje kamennou planetu v obyvatelné zóně naší nejbližší hvězdy (čelo vlny 10 ly daleko)!'],
    ['tv', '“Stranger Things”, “The Crown”, “Westworld” & 2016 Rio Olympics', 'Premiéra „Stranger Things“, „Koruny“, „Westworldu“ a OH Rio 2016', 'Global streaming hits share the year with 3.6 billion Olympic broadcast viewers.', 'Globální streamovací hity a 3,6 miliardy diváků olympiády v Riu.'],
  ],
  2017: [
    ['meti', 'Sónar Calling GJ 273b (EISCAT 929 MHz Radar → Luyten’s Star)', 'Sónar Calling GJ 273b (radar EISCAT 929 MHz → Luytenova hvězda)', '33 musical tracks + mathematical tutorial beamed toward habitable-zone super-Earth GJ 273b (12.4 ly — arrives 2030)!', '33 hudebních skladeb a matematický úvod vyslaný k super-Zemi GJ 273b (12,4 ly — přílet 2030)!'],
    ['space', 'TRAPPIST-1 Seven Earth-Sized Worlds Announced & Cassini Grand Finale', 'Oznámení 7 kamenných planet TRAPPIST-1 a Velké finále sondy Cassini', 'Cassini transmits atmospheric telemetry right down to its final fiery plunge into Saturn.', 'Cassini vysílá data ze Saturnovy atmosféry až do posledního okamžiku své mise.'],
    ['space', 'GW170817 — First Multi-Messenger Neutron Star Merger Observed Worldwide', 'GW170817 — první současné pozorování gravitačních i světelných vln ze srážky neutronových hvězd', 'Seventy observatories on every continent broadcast the cosmic origin of gold and platinum.', 'Sedmdesát observatoří planety odhaluje vesmírný původ zlata a platiny.'],
  ],
  2018: [
    ['space', 'SpaceX Falcon Heavy Maiden Flight (Starman Live) & NASA TESS Launches', 'Premiérový let Falcon Heavy (Starman) a start lovce exoplanet TESS', 'Live orbital video of a Tesla Roadster drifting past Earth while TESS begins surveying nearby stars.', 'Živý přenos startu Falcon Heavy a družice TESS hledající blízké exoplanety.'],
    ['space', 'Parker Solar Probe Launches & InSight Lands on Mars', 'Start sondy Parker Solar Probe ke Slunci a přistání InSight na Marsu', 'Twin MarCO CubeSats relay InSight’s live Martian touchdown in real time — first interplanetary CubeSat link!', 'První meziplanetární CubeSaty MarCO živě přenášejí přistání sondy InSight na Marsu!'],
    ['tv', '2018 FIFA World Cup (Russia) & PyeongChang Winter Olympics', 'MS ve fotbale 2018 a zimní olympijské hry v Pchjongčchangu', 'First World Cup broadcast natively in 4K UHD across global satellite links.', 'První mistrovství světa vysílané nativně ve 4K UHD přes satelitní sítě.'],
  ],
  2019: [
    ['space', 'Event Horizon Telescope Unveils First-Ever Black Hole Image (M87*)', 'Event Horizon Telescope zveřejňuje první snímek černé díry (M87*)', 'Six simultaneous press broadcasts across the globe reveal the glowing shadow of a 6.5-billion-solar-mass monster.', 'Šest simultánních tiskových přenosů na planetě ukazuje stín supermasivní černé díry M87*.'],
    ['space', 'Chang’e 4 First Far-Side Moon Landing & New Horizons Arrokoth Flyby', 'Čchang-e 4 přistává na odvrácené straně Měsíce a New Horizons u Arrokothu', 'Queqiao relay satellite beams live images from the unseen lunar hemisphere for the first time.', 'Přenosová družice Čchüe-čchiao poprvé zprostředkovává živé snímky z odvrácené strany Měsíce.'],
    ['tv', '“Chernobyl” (HBO), “The Mandalorian” & “Game of Thrones” Finale', 'Minisérie „Černobyl“ (HBO), premiéra „Mandaloriana“ a finále „Hry o trůny“', 'Event television commands worldwide discussion as wavefront passes 7 ly (approaching Wolf 359 & Luhman 16!).', 'Televizní události roku — jejich vlna právě míjí 7 ly (blízko Luhman 16 a WISE 0855!).'],
  ],
  2020: [
    ['space', 'SpaceX Crew Dragon Demo-2 & OSIRIS-REx Asteroid Bennu Touch-and-Go', 'První pilotovaný let Crew Dragon (Demo-2) a odběr vzorku z asteroidu Bennu', 'Live HD video from Dragon docking at ISS and OSIRIS-REx scooping primordial asteroid gravel.', 'Živé HD přenosy dokování Crew Dragon u ISS a dotyku sondy OSIRIS-REx s planetkou Bennu.'],
    ['tv', 'COVID-19 Global Pandemic Broadcasts & “The Queen’s Gambit”', 'Celosvětové zpravodajské přenosy během pandemie COVID-19 a „Dámský gambit“', 'Historic simultaneous global news briefings and home-streaming surges across every continent.', 'Historické celosvětové zpravodajské přenosy a rekordní sledovanost domácího vysílání.'],
    ['tv', 'Czechia Completes Transition to DVB-T2 (HEVC) Terrestrial TV', 'Česká republika dokončuje přechod na digitální vysílání DVB-T2', 'Modern HEVC digital broadcast network replaces legacy DVB-T transmitters across Czechia.', 'Moderní digitální síť DVB-T2 nahrazuje v ČR původní vysílání DVB-T.'],
  ],
  2021: [
    ['space', 'James Webb Space Telescope (JWST) Launches on Christmas Day + Perseverance & Ingenuity on Mars', 'Start dalekohledu Jamese Webba (JWST) na Boží hod + Perseverance a vrtulník Ingenuity na Marsu', 'First powered flight on another planet (Ingenuity) and Ariane 5’s pinpoint Christmas launch of JWST (~5 ly out — already past Alpha Centauri!).', 'První motorový let na jiné planetě (Ingenuity) a vánoční start JWST (~5 ly — už za Alfou Centauri!).'],
    ['tv', 'Tokyo 2020 (Held 2021) Olympics & “Squid Game” / “Arcane” / “Foundation”', 'Olympiáda Tokio 2020 (2021) a globální hity „Hra na oliheň“ & „Nadace“', 'Apple TV+ brings Isaac Asimov’s Foundation to screens while South Korean drama breaks global records.', 'Adaptace Asimovovy Nadace a celosvětové olympijské přenosy z Tokia.'],
  ],
  2022: [
    ['space', 'JWST First Deep Field & First Exoplanet Atmospheric Spectra + Artemis I Around the Moon', 'První hluboké pole JWST, první spektra exoplanet a mise Artemis I kolem Měsíce', 'Wavefront (~4 ly) is arriving at Proxima & Alpha Centauri RIGHT NOW — humanity announcing it can read exoplanet skies!', 'Čelo vlny (~4 ly) právě doráží k Proximě a Alfě Centauri — lidstvo oznamuje čtení atmosfér exoplanet!'],
    ['space', 'NASA DART Asteroid Impact Live Stream (Dimorphos) & EHT Image of Sgr A*', 'Živý přenos nárazu sondy DART do asteroidu Dimorphos a snímek černé díry Sgr A*', 'DRACO camera streams every final second right up to humanity’s first planetary-defense deflection!', 'Kamera DRACO vysílá živě až do samého nárazu prvního testu planetární obrany lidstva!'],
    ['tv', '2022 FIFA World Cup Final (Argentina vs. France) & Queen Elizabeth II State Funeral', 'Finále MS ve fotbale 2022 (Argentina–Francie) a státní pohřeb Alžběty II.', '1.5 billion viewers watch the Qatar final live; billions watch the historic London broadcast.', '1,5 miliardy diváků sleduje finále v Kataru v přímém přenosu.'],
  ],
  2023: [
    ['space', 'Chandrayaan-3 South Pole Moon Landing & OSIRIS-REx Sample Return', 'Přistání Čandraján-3 u jižního pólu Měsíce a návrat vzorků z Bennu', 'Over 8 million watch India’s live YouTube lunar touchdown stream simultaneously — a world record!', 'Přes 8 milionů lidí sleduje živě přistání Indie u jižního pólu Měsíce — světový rekord!'],
    ['space', 'NASA Psyche Optical Laser Comms Test (DSOC) & ESA Euclid Dark Universe Telescope', 'Laserová komunikace DSOC na sondě Psyche a dalekohled ESA Euclid', 'First deep-space HD cat video (“Taters”) beamed 31 million km by laser at 267 Mbps!', 'První HD video z hlubokého vesmíru přenesené laserem na vzdálenost 31 milionů km rychlostí 267 Mb/s!'],
    ['tv', '“The Last of Us”, “Succession” Finale & Eurovision 2023 (Liverpool)', 'Premiéra „The Last of Us“, finále „Boje o moc“ a Eurovize 2023', 'Major global TV events crossing ~3 ly — three-quarters of the way to Alpha Centauri.', 'Hlavní televizní události roku letí 3 ly daleko — ve třech čtvrtinách cesty k Alfě Centauri.'],
  ],
  2024: [
    ['space', 'Starship Flight 5 “Mechazilla” Booster Catch & Europa Clipper Launch', 'Zachycení nosiče Starship věží Mechazilla a start sondy Europa Clipper', 'Live high-definition telemetry captures the 71-meter Super Heavy booster caught mid-air by robotic arms!', 'Živý přenos zachycení 71metrového stupně Super Heavy mechanickými rameny startovací věže!'],
    ['tv', '2024 Paris Olympic Games & IIHF Ice Hockey World Championship Gold in Prague!', 'OH Paříž 2024 a zlaté MS v hokeji v Praze (Česko–Švýcarsko)!', 'Seine River opening ceremony and Czechia’s home-ice World Championship gold radiate ~2 ly into space!', 'Zahájení olympiády na Seině a české hokejové zlato z pražské O2 areny letí ~2 ly do vesmíru!'],
    ['space', 'Chang’e 6 Far-Side Lunar Sample Return & Polaris Dawn First Private Spacewalk', 'Návrat vzorků z odvrácené strany Měsíce (Čchang-e 6) a mise Polaris Dawn', 'Live Starlink-relayed orbital video shows the first commercial EVA 700 km above Earth.', 'Živý přenos prvního komerčního výstupu do kosmu přes laserové spojení Starlink.'],
  ],
  2025: [
    ['space', 'Vera C. Rubin Observatory First Light & Blue Ghost / IM-2 Commercial Moon Landings', 'První světlo observatoře Very Rubinové a komerční přistání na Měsíci', '3.2-gigapixel survey telescope unveils its first wide-field sky panoramas as lunar landers stream HD video.', '3,2gigapixelový dalekohled zahajuje mapování oblohy; soukromé landery vysílají HD video z Měsíce.'],
    ['space', 'JWST Deep-Atmosphere Campaigns on TRAPPIST-1 & K2-18 b', 'Hluboké spektroskopické kampaně JWST na TRAPPIST-1 a K2-18 b', 'High-gain Ka-band downlinks from Sun–Earth L2 stream precision exoplanet spectra (~1 ly out).', 'Přenosy v pásmu Ka z libračního bodu L2 doručují špičková spektra blízkých exoplanet (~1 ly).'],
    ['tv', 'Global 4K Satellite, DAB+ Radio & Direct-to-Cell Orbital Comms Era', 'Éra 4K satelitů, rozhlasu DAB+ a přímé satelitní komunikace mobilů', 'Thousands of LEO constellations create a diffuse, low-power global microwave haze around Earth.', 'Tisíce družic na nízké dráze vytvářejí rozptýlený, nízkovýkonný mikrovlnný opar kolem Země.'],
  ],
  2026: [
    ['space', 'Artemis II Crewed Lunar Flyby Broadcast & Deep Space Optical Links', 'Pilotovaný oblet Měsíce Artemis II a optické spoje v hlubokém vesmíru', 'Present epoch (0 ly wavefront): astronauts return to lunar space for the first time since Apollo 17!', 'Současná epocha (0 ly): astronauti se po více než půlstoletí vracejí k Měsíci v přímém přenosu!'],
    ['tv', '2026 Milano–Cortina Winter Olympics & 2026 FIFA World Cup (North America)', 'Zimní olympiáda Milán–Cortina 2026 a MS ve fotbale 2026', 'Today’s live global 4K/8K satellite & terrestrial broadcasts just leaving Earth’s ionosphere at speed c.', 'Dnešní živé celosvětové 4K/8K vysílání právě opouští zemskou ionosféru rychlostí světla c.'],
    ['space', 'Modern Planetary Radars (Goldstone DSS-14) & Deep Space Network Beacons', 'Současné planetární radary (Goldstone DSS-14) a majáky DSN', 'Narrow-beam 500 kW planetary asteroid radars remain humanity’s brightest interstellar radio beacons.', 'Úzké 500kW paprsky planetárních radarů zůstávají nejjasnějším mezihvězdným majákem lidstva.'],
  ],
};

const ALL_RAW = { ...RAW_CHRONICLE_1926_1975, ...RAW_CHRONICLE_1976_2026 };

export const BROADCAST_MIN_YEAR = 1926;
export const BROADCAST_MAX_YEAR = 2026;

/**
 * Structured map: year (1926..2026) -> array of 2–3 bilingual broadcast objects:
 *   { year, type, title: { en, cs }, detail: { en, cs } }
 */
export const BROADCAST_CHRONICLE_BY_YEAR = Object.fromEntries(
  Object.entries(ALL_RAW).map(([yrStr, tuples]) => {
    const year = Number(yrStr);
    return [
      year,
      tuples.map(([type, titleEn, titleCs, detailEn, detailCs]) => ({
        year,
        type,
        title: { en: titleEn, cs: titleCs },
        detail: { en: detailEn, cs: detailCs },
      })),
    ];
  })
);

export function getBroadcastsForYear(year) {
  const clamped = Math.max(BROADCAST_MIN_YEAR, Math.min(BROADCAST_MAX_YEAR, Math.round(year)));
  return BROADCAST_CHRONICLE_BY_YEAR[clamped] || [];
}

/**
 * Returns the era metadata (color, title, summary) for any broadcast year 1926..2026.
 */
export function getBroadcastEraForYear(year) {
  const y = Math.max(BROADCAST_MIN_YEAR, Math.min(BROADCAST_MAX_YEAR, Math.round(year)));
  if (y <= 1945) {
    return {
      id: 'era-dawn',
      color: '#38bdf8',
      title: {
        en: 'Dawn of Broadcast Radio, First VHF TV & WWII Radars (1926–1945)',
        cs: 'Úsvit rozhlasu, první VKV televize a radary 2. sv. války (1926–1945)',
      },
      summary: {
        en: 'Outer frontier (81–100 ly): early VHF television tests, commercial radio networks, and megawatt coastal air-defense radars punching through Earth’s ionosphere.',
        cs: 'Vnější hranice (81–100 ly): první VKV televizní testy, rozhlasové sítě a megawattové pobřežní radary pronikající zemskou ionosférou.',
      },
    };
  }
  if (y <= 1965) {
    return {
      id: 'era-golden',
      color: '#60a5fa',
      title: {
        en: 'Golden Age of VHF TV & Space Age Dawn (1946–1965)',
        cs: 'Zlatý věk VKV televize a úsvit kosmonautiky (1946–1965)',
      },
      summary: {
        en: 'Rapid global expansion (61–80 ly): national VHF television booms (BBC, NBC, CBS, ČST, Eurovision), Sputnik 1 orbital beeps, and early ballistic-missile radars.',
        cs: 'Globální rozmach (61–80 ly): boom národních VKV televizí (BBC, NBC, CBS, ČST, Eurovize), pípání Sputniku 1 a raných kosmických radarů.',
      },
    };
  }
  if (y <= 1975) {
    return {
      id: 'era-apollo',
      color: '#818cf8',
      title: {
        en: 'Apollo Moon Landings, Star Trek & Arecibo (1966–1975)',
        cs: 'Přistání Apolla na Měsíci, Star Trek a Arecibo (1966–1975)',
      },
      summary: {
        en: 'Peak analog broadcast era (51–60 ly): color VHF/UHF networks, live S-band lunar television from Apollo, and the 1974 Arecibo Message.',
        cs: 'Vrchol analogové éry (51–60 ly): barevné VKV/UHF sítě, živé lunární TV přenosy Apolla a zpráva z Areciba (1974).',
      },
    };
  }
  if (y <= 1995) {
    return {
      id: 'era-twoway',
      color: '#00ff88',
      title: {
        en: 'Inside Two-Way Reply Horizon (≤50 ly) · Peak Analog Era (1976–1995)',
        cs: 'Uvnitř horizontu 2-směrné odezvy (≤50 ly) · Vrchol analogu (1976–1995)',
      },
      summary: {
        en: 'CRITICAL SETI ZONE (≤50 ly): Any star within 50 ly that detected Earth’s 1926 dawn has already had time to beam a reply back to Earth by 2026! Peak global VHF/UHF TV power.',
        cs: 'KLÍČOVÁ ZÓNA SETI (≤50 ly): Hvězdy do 50 ly, které zachytily signály z r. 1926, už stihly poslat světelnou odpověď zpět na Zemi do r. 2026! Vrchol výkonu analogové TV.',
      },
    };
  }
  if (y <= 2010) {
    return {
      id: 'era-radar',
      color: '#f59e0b',
      title: {
        en: 'Satellite TV, Cosmic Call & Planetary Radar Era (1996–2010)',
        cs: 'Satelitní TV, Cosmic Call a planetární radary (1996–2010)',
      },
      summary: {
        en: 'Late analog to digital transition (16–30 ly): global satellite TV peaks while intentional 150 kW Evpatoria METI beams (Cosmic Call 1 & 2, AMFE) race outward.',
        cs: 'Přechod k digitálu (16–30 ly): satelitní televize kulminuje a k blízkým hvězdám míří směrové 150kW METI přenosy z Jevpatorije (Cosmic Call 1 a 2, AMFE).',
      },
    };
  }
  return {
    id: 'era-digital',
    color: '#c084fc',
    title: {
      en: 'HD Digital Quieting, Sónar Calling & JWST Era (2011–2026)',
      cs: 'HD digitální ztišení, Sónar Calling a éra JWST (2011–2026)',
    },
    summary: {
      en: 'Inner solar neighborhood (0–15 ly): accidental megawatt TV leakage drops sharply as fiber, streaming, and low-power DVB-T2 take over — while METI & DSN radars shine brightly.',
      cs: 'Vnitřní okolí Slunce (0–15 ly): nechtěný únik megawattových TV klesá díky optice, streamování a DVB-T2 — zatímco směrové METI a radary DSN září dál.',
    },
  };
}
