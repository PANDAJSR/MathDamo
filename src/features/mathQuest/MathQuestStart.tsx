import { Button, Select, Typography } from 'antd'
import './MathQuestStart.css'
import type { QuestionDifficulty } from './types'

const difficultyOptions: Array<{ label: string; value: QuestionDifficulty }> = [
  { label: '基础', value: 'easy' },
  { label: '进阶', value: 'medium' },
  { label: '挑战', value: 'hard' },
]

type MathQuestStartProps = {
  availableTags: string[]
  playableQuestionCount: number
  selectedTags: string[]
  selectedDifficulties: QuestionDifficulty[]
  onSelectedTagsChange: (tags: string[]) => void
  onSelectedDifficultiesChange: (difficulties: QuestionDifficulty[]) => void
  onStart: () => void
  onBackHome: () => void
  onOpenMultiplayer: () => void
  score?: number
  completedQuestionCount?: number
  connectionText?: string
}

export function MathQuestStart({
  availableTags,
  playableQuestionCount,
  selectedTags,
  selectedDifficulties,
  onSelectedTagsChange,
  onSelectedDifficultiesChange,
  onStart,
  onBackHome,
  onOpenMultiplayer,
  score,
  completedQuestionCount,
  connectionText,
}: MathQuestStartProps) {
  const finished = score !== undefined
  const tagOptions = availableTags.map((tag) => ({ label: tag, value: tag }))

  return (
    <section className="math-quest math-quest--center">
      <div className="math-quest__start">
        <span className="math-quest__eyebrow">{finished ? '本轮完成' : '趣味数学闯关'}</span>
        <Typography.Title>{finished ? `${score} 分` : '随机题库挑战'}</Typography.Title>
        <Typography.Paragraph>
          {finished
            ? `已经完成 ${completedQuestionCount ?? playableQuestionCount} 道随机题。`
            : '题库包含单选、多选和填空题。开始前可选择知识点和难度，只练对应题目。'}
        </Typography.Paragraph>
        {connectionText && <div className="math-quest__connection">{connectionText}</div>}
        <div className="math-quest__filters">
          <div className="math-quest__tag-picker">
            <span>知识点</span>
            <Select
              mode="multiple"
              allowClear
              placeholder="全部知识点"
              options={tagOptions}
              value={selectedTags}
              onChange={onSelectedTagsChange}
              maxTagCount="responsive"
            />
            <small>
              {selectedTags.length === 0 ? `全部 ${playableQuestionCount} 题` : `已选范围 ${playableQuestionCount} 题`}
            </small>
          </div>
          <div className="math-quest__tag-picker">
            <span>难度</span>
            <Select
              mode="multiple"
              allowClear
              placeholder="全部难度"
              options={difficultyOptions}
              value={selectedDifficulties}
              onChange={onSelectedDifficultiesChange}
              maxTagCount="responsive"
            />
            <small>{selectedDifficulties.length === 0 ? '基础、进阶、挑战' : '只练所选难度'}</small>
          </div>
        </div>
        <div className="math-quest__start-actions">
          <Button
            className="math-quest__start-button"
            type="primary"
            disabled={playableQuestionCount === 0}
            onClick={onStart}
          >
            {finished ? '再来一轮' : '开始闯关'}
          </Button>
          <Button
            className="math-quest__start-button"
            onClick={finished ? onBackHome : onOpenMultiplayer}
          >
            {finished ? '返回主页' : '多人模式'}
          </Button>
        </div>
      </div>
    </section>
  )
}
