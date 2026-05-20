import { Button, Select, Typography } from 'antd'
import './MathQuestStart.css'

type MathQuestStartProps = {
  availableTags: string[]
  playableQuestionCount: number
  selectedTags: string[]
  onSelectedTagsChange: (tags: string[]) => void
  onStart: () => void
  score?: number
  completedQuestionCount?: number
}

export function MathQuestStart({
  availableTags,
  playableQuestionCount,
  selectedTags,
  onSelectedTagsChange,
  onStart,
  score,
  completedQuestionCount,
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
            : '题库包含单选、多选和填空题。开始前可选择一个或多个知识点，只练对应题目。'}
        </Typography.Paragraph>
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
        <Button
          className="math-quest__start-button"
          type="primary"
          disabled={playableQuestionCount === 0}
          onClick={onStart}
        >
          {finished ? '再来一轮' : '开始闯关'}
        </Button>
      </div>
    </section>
  )
}
