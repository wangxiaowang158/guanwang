// 密码指纹 —— 把令牌与「签发时的密码」绑定，改密即令旧令牌失效
// 用密码哈希的 HMAC 截断值而非哈希本身：令牌载荷是 base64 明文，
// 直接放 bcrypt 哈希等于把它交给任何拿到令牌的人去离线爆破
import { createHmac } from 'node:crypto'

/**
 * 计算密码指纹
 * @param passwordHash 库中存的 bcrypt 哈希；每次改密都会重新生成，指纹随之变化
 * @param secret HMAC 密钥，用令牌签名密钥即可，指纹无法脱离密钥伪造
 * @returns 16 位十六进制串，足够区分改密前后，又不至于让令牌膨胀
 */
export function passwordFingerprint(passwordHash: string, secret: string): string {
  return createHmac('sha256', secret).update(passwordHash).digest('hex').slice(0, 16)
}
