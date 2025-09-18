import type { TTSVoices, SelectedHosts, NewscastOutput } from './types.ts';

export function getVoicesByGender(voices: TTSVoices): { male: string[]; female: string[] } {
  const male: string[] = [];
  const female: string[] = [];

  for (const [voiceModel, config] of Object.entries(voices.voices)) {
    if (config.gender === 'male') {
      male.push(voiceModel);
    } else if (config.gender === 'female') {
      female.push(voiceModel);
    }
  }

  return { male, female };
}

export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function selectRandomHosts(voices: TTSVoices): SelectedHosts {
  const { male, female } = getVoicesByGender(voices);

  if (male.length === 0 || female.length === 0) {
    throw new Error('남성 또는 여성 음성 모델이 부족합니다.');
  }

  const isMaleFirst = Math.random() < 0.5;

  const selectedMale = randomChoice(male);
  const selectedFemale = randomChoice(female);

  const host1 = isMaleFirst
    ? { voice_model: selectedMale, name: voices.voices[selectedMale].name, gender: 'male' as const }
    : { voice_model: selectedFemale, name: voices.voices[selectedFemale].name, gender: 'female' as const };

  const host2 = isMaleFirst
    ? { voice_model: selectedFemale, name: voices.voices[selectedFemale].name, gender: 'female' as const }
    : { voice_model: selectedMale, name: voices.voices[selectedMale].name, gender: 'male' as const };

  return { host1, host2 };
}

export function getHostIdFromRole(role: string): string {
  return role === 'host1' ? 'host1' : 'host2';
}

export function formatAsMarkdown(newscast: NewscastOutput): string {
  const scriptText = newscast.script
    .map((line, index) => {
      const seq = (index + 1).toString().padStart(3, '0');
      if (line.type === 'music') {
        return `### ${seq}. 🎵 ${line.name}\n> *${line.content}*`;
      } else {
        const voiceModel = 'voice_model' in line ? ` \`${line.voice_model}\`` : '';
        const genderIcon = line.name === newscast.hosts.host1.name
          ? (newscast.hosts.host1.gender === 'male' ? '👨‍💼' : '👩‍💼')
          : (newscast.hosts.host2.gender === 'male' ? '👨‍💼' : '👩‍💼');
        return `### ${seq}. ${genderIcon} ${line.name}${voiceModel}\n> "${line.content}"`;
      }
    })
    .join('\n\n');

  return `# 🎙️ ${newscast.title}

> **${newscast.program_name} 뉴스캐스트 스크립트**
> 📅 생성일시: ${new Date(newscast.metadata.generation_timestamp).toLocaleString('ko-KR')}
> ⏱️ 예상 진행시간: ${newscast.estimated_duration}

## 👥 진행자 정보

| 구분 | 이름 | 성별 | 음성 모델 |
|------|------|------|-----------|
| **호스트 1** | ${newscast.hosts.host1.name} | ${newscast.hosts.host1.gender === 'male' ? '남성' : '여성'} | \`${newscast.hosts.host1.voice_model}\` |
| **호스트 2** | ${newscast.hosts.host2.name} | ${newscast.hosts.host2.gender === 'male' ? '남성' : '여성'} | \`${newscast.hosts.host2.voice_model}\` |

## 📊 메타데이터

| 항목 | 내용 |
|------|------|
| **참고 기사 수** | ${newscast.metadata.total_articles}개 |
| **참고 언론사 수** | ${newscast.metadata.sources_count}개사 |
| **주요 언론사** | ${newscast.metadata.main_sources.join(', ')} |
| **총 스크립트 라인** | ${newscast.metadata.total_script_lines}개 |

---

## 🎬 뉴스캐스트 스크립트

${scriptText}

---

*🤖 AI 뉴스캐스트 시스템으로 생성된 스크립트입니다.*
`;
}
