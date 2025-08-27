"use client"

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {Check, X, AlertCircle} from "lucide-react"
import type {WordPlacement} from "@/lib/word-validator"

interface WordPlacementDisplayProps {
    word: string
    isValid: boolean
    placements: WordPlacement[]
    onPlacementSelect: (placement: WordPlacement) => void
    onReject: () => void
}

export function WordPlacementDisplay({
                                         word,
                                         isValid,
                                         placements,
                                         onPlacementSelect,
                                         onReject,
                                     }: WordPlacementDisplayProps) {
    if (!word) return null

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Слово: {word}</span>
                    <Badge variant={isValid ? "default" : "destructive"}>{isValid ? "Валидно" : "Невалидно"}</Badge>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {!isValid ? (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-destructive"/>
                        <span
                            className="text-sm text-destructive">Слово не является допустимым русским существительным</span>
                    </div>
                ) : placements.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <AlertCircle className="w-5 h-5 text-muted-foreground"/>
                        <span className="text-sm text-muted-foreground">Невозможно разместить слово на поле</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="text-sm font-medium">Возможные размещения:</div>
                        {placements.map((placement, index) => {
                            const start = placement.path[0]
                            const end = placement.path[placement.path.length - 1]

                            let direction: string = "?"
                            if (placement.path.length > 1) {
                                if (start.r === end.r) {
                                    direction = "Горизонтально"
                                } else if (start.c === end.c) {
                                    direction = "Вертикально"
                                } else {
                                    direction = "По диагонали"
                                }
                            }

                            return (
                                <div key={index} className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">{direction}</span>
                                        <Badge variant="outline" className="text-xs">
                                            +{word.length} очков
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-2">
                                        Позиция: ({start.r + 1}, {start.c + 1})
                                        <br/>
                                        Новая буква: {placement.newLetter} в
                                        ({placement.newLetterPos.r + 1}, {placement.newLetterPos.c + 1})
                                    </div>
                                    <Button onClick={() => onPlacementSelect(placement)} size="sm" className="w-full">
                                        <Check className="w-4 h-4 mr-2"/>
                                        Разместить
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className="flex gap-2">
                    <Button onClick={onReject} variant="outline" size="sm" className="flex-1 bg-transparent">
                        <X className="w-4 h-4 mr-2"/>
                        Отклонить
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
